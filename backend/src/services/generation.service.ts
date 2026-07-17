import { Inject, Injectable, Logger } from '@nestjs/common';
import { imageSize } from 'image-size';
import {
  ETIQUETA_DE_ESTILO,
  INSTRUCCION_DE_ESTILO_FOTO,
  MODIFICADOR_DE_ESTILO,
  PRESERVAR_IDENTIDAD,
  PRISMA_A_CALIDAD,
  PRISMA_A_ESTILO,
  PRISMA_A_FORMATO,
  RESOLUCIONES,
} from '../common/domain/catalogo';
import { NotFoundError, ValidationError } from '../common/errors/domain.errors';
import {
  EstilizarFotoDto,
  decodificarFoto,
} from '../controllers/dto/estilizar-foto.dto';
import { GenerarImagenDto } from '../controllers/dto/generar-imagen.dto';
import {
  IMAGE_EDIT_PROVIDER,
  IMAGE_PROVIDER,
} from '../interfaces/image-provider.interface';
import { PROMPT_ENHANCER } from '../interfaces/prompt-enhancer.interface';
// `import type`: con emitDecoratorMetadata, los tipos de un constructor
// decorado con @Inject no pueden importarse como valores.
import type {
  ImageEditProvider,
  ImageProvider,
} from '../interfaces/image-provider.interface';
import type { PromptEnhancer } from '../interfaces/prompt-enhancer.interface';
import {
  GenerationConPrompt,
  GenerationRepository,
} from '../repositories/generation.repository';
import { PromptRepository } from '../repositories/prompt.repository';
import { StorageService } from './storage.service';

/** Representación de una generación tal y como la consume el frontend. */
export interface GenerationDto {
  readonly id: string;
  readonly imageUrl: string;
  readonly width: number;
  readonly height: number;
  readonly promptOriginal: string;
  readonly promptMejorado: string | null;
  readonly estilo: string;
  readonly formato: string;
  readonly calidad: string;
  readonly proveedor: string;
  readonly generationTime: number;
  readonly createdAt: string;
}

/** Notifica el avance para que la barra de progreso no sea decorativa. */
export type ReportarProgreso = (porcentaje: number, etapa: string) => Promise<void>;

/**
 * Orquesta el ciclo completo: mejorar → generar → almacenar → persistir.
 *
 * Lo ejecuta el worker de BullMQ, no el controlador: generar una imagen tarda
 * decenas de segundos y bloquear una petición HTTP todo ese tiempo no sobrevive
 * a una cola de visitantes.
 */
@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    @Inject(IMAGE_PROVIDER) private readonly imageProvider: ImageProvider,
    // Null si IMAGE_EDIT_PROVIDER=none: la cámara es una función opcional.
    @Inject(IMAGE_EDIT_PROVIDER)
    private readonly editProvider: ImageEditProvider | null,
    @Inject(PROMPT_ENHANCER) private readonly enhancer: PromptEnhancer,
    private readonly storage: StorageService,
    private readonly prompts: PromptRepository,
    private readonly generations: GenerationRepository,
  ) {}

  /** ¿Está disponible la función de cámara? Lo consulta `/api/health`. */
  get edicionDisponible(): boolean {
    return this.editProvider !== null;
  }

  async generar(
    dto: GenerarImagenDto,
    reportarProgreso: ReportarProgreso,
  ): Promise<GenerationDto> {
    const inicio = Date.now();

    // 1. Mejorar el prompt (opcional). El enhancer nunca lanza: si el LLM falla,
    //    devuelve el original y seguimos adelante.
    await reportarProgreso(10, 'Mejorando tu prompt…');

    const promptMejorado = dto.mejorarPrompt
      ? await this.enhancer.mejorar(dto.prompt, ETIQUETA_DE_ESTILO[dto.estilo])
      : null;

    // 2. Componer el prompt final con el modificador de estilo.
    const promptFinal = this.componerPrompt(promptMejorado ?? dto.prompt, dto.estilo);
    const { width, height } = RESOLUCIONES[dto.formato][dto.calidad];

    // 3. Generar la imagen.
    await reportarProgreso(30, 'La IA está imaginando tu mundo…');

    const resultado = await this.imageProvider.generar({
      prompt: promptFinal,
      width,
      height,
      seed: dto.seed,
    });

    // El tiempo de generación se mide aquí: es lo que tardó la IA, sin contar
    // la subida ni la escritura en base de datos.
    const generationTime = Date.now() - inicio;

    // Los proveedores informan de las dimensiones que se les pidieron, pero no
    // siempre las respetan: Pollinations devolvió 1015x580 cuando se le pidieron
    // 1344x768. Se miden sobre los bytes reales para que la etiqueta de
    // resolución de la UI no mienta y `next/image` reserve el hueco correcto.
    const medidas = this.medirImagen(resultado.bytes, resultado);

    // 4. Subir a Supabase Storage.
    await reportarProgreso(75, 'Guardando tu obra maestra…');

    const subida = await this.storage.subirImagen(resultado.bytes, resultado.mimeType);

    // 5. Persistir. Si esto falla, la imagen ya está en Storage: hay que
    //    borrarla o quedaría huérfana, sin ninguna fila que la referencie.
    await reportarProgreso(90, 'Casi listo…');

    try {
      const prompt = await this.prompts.crear({
        promptOriginal: dto.prompt,
        promptMejorado,
        estilo: dto.estilo,
        formato: dto.formato,
        calidad: dto.calidad,
        proveedor: this.imageProvider.nombre,
        origen: 'TEXTO',
      });

      const generation = await this.generations.crearYPublicar({
        promptId: prompt.id,
        imageUrl: subida.publicUrl,
        storagePath: subida.path,
        width: medidas.width,
        height: medidas.height,
        mimeType: subida.mimeType,
        fileSize: subida.fileSize,
        generationTime,
        providerResponse: resultado.raw,
      });

      await reportarProgreso(100, '¡Listo!');

      this.logger.log(
        `Imagen generada en ${generationTime}ms con ${this.imageProvider.nombre} ` +
          `(pedida ${width}x${height}, recibida ${medidas.width}x${medidas.height}).`,
      );

      return this.aDto(generation);
    } catch (error) {
      await this.storage.borrarImagen(subida.path);
      throw error;
    }
  }

  /**
   * Estiliza una foto de la cámara.
   *
   * Diferencias de fondo con `generar()`:
   * - No pasa por el mejorador de prompt: aquí no hay idea que enriquecer, hay
   *   una transformación concreta que aplicar sobre una foto que ya existe.
   * - La foto original **nunca se guarda**. Viaja al proveedor, se usa y se
   *   descarta con el trabajo; solo se persiste el resultado estilizado.
   * - Se marca con origen FOTO, y eso mantiene el resultado fuera de la galería
   *   y del historial públicos.
   */
  async estilizarFoto(
    dto: EstilizarFotoDto,
    reportarProgreso: ReportarProgreso,
  ): Promise<GenerationDto> {
    if (this.editProvider === null) {
      throw new ValidationError(
        'La función de cámara no está disponible en este momento.',
      );
    }

    const inicio = Date.now();

    const foto = decodificarFoto(dto.foto);
    if ('error' in foto) {
      throw new ValidationError(foto.error);
    }

    // Las dimensiones reales de la foto deciden la orientación del resultado:
    // un retrato vertical debe salir vertical.
    const medidas = this.medirImagen(foto.bytes, { width: 1024, height: 1024 });

    await reportarProgreso(25, 'La IA está reimaginando tu foto…');

    const prompt = this.componerPromptFoto(dto);

    const resultado = await this.editProvider.editar({
      prompt,
      imagen: foto.bytes,
      mimeType: foto.mimeType,
      width: medidas.width,
      height: medidas.height,
    });

    const generationTime = Date.now() - inicio;

    await reportarProgreso(75, 'Guardando tu retrato…');

    const subida = await this.storage.subirImagen(resultado.bytes, resultado.mimeType);

    await reportarProgreso(90, 'Casi listo…');

    try {
      const medidasFinales = this.medirImagen(resultado.bytes, resultado);

      const promptFila = await this.prompts.crear({
        // Se guarda la nota del usuario, no la foto ni la instrucción interna.
        promptOriginal: dto.nota?.trim() || `Foto en estilo ${ETIQUETA_DE_ESTILO[dto.estilo]}`,
        promptMejorado: prompt,
        estilo: dto.estilo,
        // El formato lo impone la foto, no el usuario: se deduce de su forma.
        formato: this.formatoDeMedidas(medidasFinales),
        calidad: 'hd',
        proveedor: this.editProvider.nombre,
        origen: 'FOTO',
      });

      const generation = await this.generations.crearYPublicar({
        promptId: promptFila.id,
        imageUrl: subida.publicUrl,
        storagePath: subida.path,
        width: medidasFinales.width,
        height: medidasFinales.height,
        mimeType: subida.mimeType,
        fileSize: subida.fileSize,
        generationTime,
        providerResponse: resultado.raw,
      });

      await reportarProgreso(100, '¡Listo!');

      this.logger.log(
        `Foto estilizada (${dto.estilo}) en ${generationTime}ms con ${this.editProvider.nombre}.`,
      );

      return this.aDto(generation);
    } catch (error) {
      await this.storage.borrarImagen(subida.path);
      throw error;
    }
  }

  /**
   * Compone la instrucción de edición.
   *
   * Orden deliberado: primero preservar la identidad, luego el estilo, y la
   * nota del usuario al final. En los modelos de difusión los primeros tokens
   * pesan más, y si el visitante no se reconoce la demo no sirve de nada.
   */
  private componerPromptFoto(dto: EstilizarFotoDto): string {
    const partes = [PRESERVAR_IDENTIDAD, INSTRUCCION_DE_ESTILO_FOTO[dto.estilo]];

    const nota = dto.nota?.trim();
    if (nota) {
      partes.push(`Additional request from the user: ${nota}`);
    }

    return partes.join(' ');
  }

  /** Deduce el formato a partir de la forma real de la imagen. */
  private formatoDeMedidas(medidas: { width: number; height: number }): GenerarImagenDto['formato'] {
    const ratio = medidas.width / medidas.height;
    if (ratio > 1.2) return '16:9';
    if (ratio < 0.83) return '9:16';
    return '1:1';
  }

  /** Historial: las generaciones más recientes. */
  async recientes(limite: number): Promise<GenerationDto[]> {
    const generaciones = await this.generations.recientes(limite);
    return generaciones.map((generation) => this.aDto(generation));
  }

  async porId(id: string): Promise<GenerationDto> {
    const generation = await this.generations.porId(id);

    if (!generation) {
      throw new NotFoundError('la generación', id);
    }

    return this.aDto(generation);
  }

  /**
   * Lee las dimensiones reales de los bytes de la imagen.
   *
   * Si el formato no se reconoce, se cae a lo que declaró el proveedor: unas
   * dimensiones aproximadas son mejores que perder una imagen ya generada.
   */
  private medirImagen(
    bytes: Buffer,
    declaradas: { width: number; height: number },
  ): { width: number; height: number } {
    try {
      const { width, height } = imageSize(bytes);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    } catch (error) {
      this.logger.warn(
        { err: error },
        'No se pudieron medir las dimensiones; se usan las del proveedor.',
      );
    }

    return { width: declaradas.width, height: declaradas.height };
  }

  /**
   * Une el prompt con el modificador de estilo.
   *
   * El modificador va al final: en los modelos de difusión los primeros tokens
   * pesan más, así que el sujeto del usuario debe encabezar la frase.
   */
  private componerPrompt(prompt: string, estilo: GenerarImagenDto['estilo']): string {
    const base = prompt.trim().replace(/[.,\s]+$/, '');
    return `${base}, ${MODIFICADOR_DE_ESTILO[estilo]}`;
  }

  private aDto(generation: GenerationConPrompt): GenerationDto {
    return {
      id: generation.id,
      imageUrl: generation.imageUrl,
      width: generation.width,
      height: generation.height,
      promptOriginal: generation.prompt.promptOriginal,
      promptMejorado: generation.prompt.promptMejorado,
      estilo: PRISMA_A_ESTILO[generation.prompt.estilo],
      formato: PRISMA_A_FORMATO[generation.prompt.formato],
      calidad: PRISMA_A_CALIDAD[generation.prompt.calidad],
      proveedor: generation.prompt.proveedor,
      generationTime: generation.generationTime,
      createdAt: generation.createdAt.toISOString(),
    };
  }
}
