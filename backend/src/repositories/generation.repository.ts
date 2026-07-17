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
   * Crea la generación y publica su entrada en la galería en una única
   * transacción: una imagen que existe pero no aparece en la galería sería un
   * estado incoherente que habría que reparar a mano.
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

      await tx.gallery.create({ data: { generationId: generation.id } });

      return generation;
    });
  }

  async porId(id: string): Promise<GenerationConPrompt | null> {
    return this.prisma.generation.findUnique({
      where: { id },
      include: { prompt: true },
    });
  }

  /** Historial: las generaciones más recientes. */
  async recientes(limite: number): Promise<GenerationConPrompt[]> {
    return this.prisma.generation.findMany({
      take: limite,
      orderBy: { createdAt: 'desc' },
      include: { prompt: true },
    });
  }
}
