import { Inject, Injectable, Logger } from '@nestjs/common';
import { imageSize } from 'image-size';
import {
  ETIQUETA_DE_ESTILO,
  MODIFICADOR_DE_ESTILO,
  PRISMA_A_CALIDAD,
  PRISMA_A_ESTILO,
  PRISMA_A_FORMATO,
  RESOLUCIONES,
} from '../common/domain/catalogo';
import { NotFoundError } from '../common/errors/domain.errors';
import { GenerarImagenDto } from '../controllers/dto/generar-imagen.dto';
import { IMAGE_PROVIDER } from '../interfaces/image-provider.interface';
import { PROMPT_ENHANCER } from '../interfaces/prompt-enhancer.interface';
// `import type`: con emitDecoratorMetadata, los tipos de un constructor
// decorado con @Inject no pueden importarse como valores.
import type { ImageProvider } from '../interfaces/image-provider.interface';
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
    @Inject(PROMPT_ENHANCER) private readonly enhancer: PromptEnhancer,
    private readonly storage: StorageService,
    private readonly prompts: PromptRepository,
    private readonly generations: GenerationRepository,
  ) {}

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
