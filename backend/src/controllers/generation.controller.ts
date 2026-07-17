import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import { ideasAleatorias } from '../common/domain/inspiracion';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  EstadoGeneracion,
  GenerationQueueService,
} from '../services/generation-queue.service';
import { GenerationDto, GenerationService } from '../services/generation.service';
import { estilizarFotoSchema } from './dto/estilizar-foto.dto';
import { generarImagenSchema } from './dto/generar-imagen.dto';
// `import type` es obligatorio: con emitDecoratorMetadata, un tipo usado en una
// firma decorada no puede importarse como valor.
import type { EstilizarFotoDto } from './dto/estilizar-foto.dto';
import type { GenerarImagenDto } from './dto/generar-imagen.dto';

const historialQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(50).default(12),
});

/** API de generación de imágenes. */
@Controller('api/generations')
export class GenerationController {
  constructor(
    private readonly cola: GenerationQueueService,
    private readonly generations: GenerationService,
  ) {}

  /**
   * Encola una generación.
   *
   * Responde 202 y no 201: la imagen todavía no existe. El cliente sondea
   * `GET /api/generations/status/:jobId` hasta que esté lista.
   */
  @Post()
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(generarImagenSchema))
  async generar(@Body() dto: GenerarImagenDto): Promise<{ jobId: string }> {
    const jobId = await this.cola.encolar(dto);
    return { jobId };
  }

  /**
   * Encola el estilizado de una foto de la cámara.
   *
   * La foto viaja en el cuerpo como data URL y **no se almacena**: solo se pasa
   * al proveedor. El resultado se marca con origen FOTO y queda fuera de la
   * galería y del historial públicos.
   */
  @Post('photo')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(estilizarFotoSchema))
  async estilizarFoto(@Body() dto: EstilizarFotoDto): Promise<{ jobId: string }> {
    const jobId = await this.cola.encolarFoto(dto);
    return { jobId };
  }

  /** Estado de un trabajo. El frontend hace polling contra esto. */
  @Get('status/:jobId')
  async estado(@Param('jobId') jobId: string): Promise<EstadoGeneracion> {
    return this.cola.estado(jobId);
  }

  /** Historial: las generaciones más recientes. */
  @Get('history')
  async historial(@Query() query: unknown): Promise<GenerationDto[]> {
    const { limite } = historialQuerySchema.parse(query);
    return this.generations.recientes(limite);
  }

  /** Ideas aleatorias para el botón "Inspirarme". */
  @Get('inspiration')
  inspiracion(): { ideas: string[] } {
    return { ideas: ideasAleatorias(5) };
  }

  /**
   * Una generación concreta.
   *
   * Va al final a propósito: `:id` es comodín y capturaría "history",
   * "inspiration" o "status" si se declarara antes que ellas.
   */
  @Get(':id')
  async porId(@Param('id') id: string): Promise<GenerationDto> {
    return this.generations.porId(id);
  }
}
