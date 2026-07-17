import { Injectable } from '@nestjs/common';
import { Generation, Prisma, Prompt } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';

export interface CrearGenerationInput {
  readonly promptId: string;
  readonly imageUrl: string;
  readonly storagePath: string;
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly generationTime: number;
  readonly providerResponse: Record<string, unknown>;
}

/** Una generación junto con el prompt que la originó. */
export type GenerationConPrompt = Generation & { prompt: Prompt };

/** Acceso a la tabla `generations`. */
@Injectable()
export class GenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea la generación y, si procede, publica su entrada en la galería, todo en
   * una única transacción: una imagen que existe pero no aparece en la galería
   * sería un estado incoherente que habría que reparar a mano.
   *
   * **Las generaciones con origen FOTO no se publican.** Salen de la cámara y
   * pueden contener la cara de un visitante, así que la decisión no puede
   * quedar en manos de quien llame a este método: se resuelve aquí, leyendo el
   * `origen` del prompt que se acaba de guardar.
   */
  async crearYPublicar(input: CrearGenerationInput): Promise<GenerationConPrompt> {
    return this.prisma.$transaction(async (tx) => {
      const generation = await tx.generation.create({
        data: {
          promptId: input.promptId,
          imageUrl: input.imageUrl,
          storagePath: input.storagePath,
          width: input.width,
          height: input.height,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          generationTime: input.generationTime,
          providerResponse: input.providerResponse as Prisma.InputJsonValue,
        },
        include: { prompt: true },
      });

      if (generation.prompt.origen === 'TEXTO') {
        await tx.gallery.create({ data: { generationId: generation.id } });
      }

      return generation;
    });
  }

  async porId(id: string): Promise<GenerationConPrompt | null> {
    return this.prisma.generation.findUnique({
      where: { id },
      include: { prompt: true },
    });
  }

  /**
   * Historial: las generaciones más recientes.
   *
   * Excluye las de origen FOTO. El historial se pinta en la portada y lo ve
   * todo el mundo, así que es tan público como la galería: colar ahí la cara de
   * un visitante sería el mismo problema por otra puerta.
   */
  async recientes(limite: number): Promise<GenerationConPrompt[]> {
    return this.prisma.generation.findMany({
      take: limite,
      where: { prompt: { origen: 'TEXTO' } },
      orderBy: { createdAt: 'desc' },
      include: { prompt: true },
    });
  }
}
