import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DomainError } from '../../common/errors/domain.errors';
import {
  COLA_GENERACION,
  DatosTrabajo,
} from '../../services/generation-queue.service';
import { GenerationDto, GenerationService } from '../../services/generation.service';

/**
 * Worker que consume la cola de generación.
 *
 * La concurrencia está limitada a 3 a propósito: los proveedores de imagen
 * imponen límites de tasa y Pollinations, que es gratuito, se degrada si lo
 * saturas. Es mejor que los visitantes hagan cola unos segundos a que todas las
 * generaciones fallen a la vez.
 */
@Processor(COLA_GENERACION, { concurrency: 3 })
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(private readonly generationService: GenerationService) {
    super();
  }

  async process(job: Job<DatosTrabajo>): Promise<GenerationDto> {
    this.logger.log(`Procesando trabajo ${job.id}: "${job.data.prompt.slice(0, 60)}"`);

    try {
      return await this.generationService.generar(job.data, async (porcentaje, etapa) => {
        await job.updateProgress({ porcentaje, etapa });
      });
    } catch (error) {
      // Los errores de dominio ya traen un mensaje pensado para el usuario;
      // cualquier otra cosa podría filtrar detalles internos, así que se
      // registra completa y se devuelve un texto genérico.
      if (error instanceof DomainError) {
        this.logger.warn(
          { err: error.cause, jobId: job.id },
          `Trabajo ${job.id} falló: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.error({ err: error, jobId: job.id }, `Trabajo ${job.id} falló.`);
      throw new Error('No pudimos generar la imagen. Inténtalo de nuevo.');
    }
  }
}
