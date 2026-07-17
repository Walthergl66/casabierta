import { Injectable } from '@nestjs/common';
import {
  CALIDAD_A_PRISMA,
  CalidadApi,
  ESTILO_A_PRISMA,
  EstiloApi,
  FORMATO_A_PRISMA,
  FormatoApi,
} from '../common/domain/catalogo';
import { Prompt } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';

export interface CrearPromptInput {
  readonly promptOriginal: string;
  readonly promptMejorado: string | null;
  readonly estilo: EstiloApi;
  readonly formato: FormatoApi;
  readonly calidad: CalidadApi;
  readonly proveedor: string;
}

/** Acceso a la tabla `prompts`. */
@Injectable()
export class PromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: CrearPromptInput): Promise<Prompt> {
    return this.prisma.prompt.create({
      data: {
        promptOriginal: input.promptOriginal,
        promptMejorado: input.promptMejorado,
        estilo: ESTILO_A_PRISMA[input.estilo],
        formato: FORMATO_A_PRISMA[input.formato],
        calidad: CALIDAD_A_PRISMA[input.calidad],
        proveedor: input.proveedor,
      },
    });
  }

  async porId(id: string): Promise<Prompt | null> {
    return this.prisma.prompt.findUnique({ where: { id } });
  }
}
