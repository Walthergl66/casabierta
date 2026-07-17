import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { JobProgress, Queue } from 'bullmq';
import { GenerarImagenDto } from '../controllers/dto/generar-imagen.dto';
import { GenerationDto } from './generation.service';

/** Nombre de la cola. Compartido por el productor y el worker. */
export const COLA_GENERACION = 'generacion-imagenes';

/** Estados que el frontend distingue para pintar la UI. */
export type EstadoTrabajo =
  | 'en-cola'
  | 'procesando'
  | 'completado'
  | 'fallido'
  | 'desconocido';

export interface EstadoGeneracion {
  readonly jobId: string;
  readonly estado: EstadoTrabajo;
  /** 0-100. */
  readonly progreso: number;
  /** Texto para mostrar al usuario mientras espera. */
  readonly etapa: string;
  /** Posición en la cola; solo si aún no ha empezado. */
  readonly posicionEnCola?: number;
  /** Presente solo cuando el estado es "completado". */
  readonly resultado?: GenerationDto;
  /** Presente solo cuando el estado es "fallido". */
  readonly error?: string;
}

/** Datos que el worker recibe con cada trabajo. */
export type DatosTrabajo = GenerarImagenDto;

/** Lo que el worker adjunta al progreso, para que el cliente lo lea. */
interface ProgresoTrabajo {
  porcentaje: number;
  etapa: string;
}

/**
 * Encola generaciones y consulta su estado.
 *
 * El controlador nunca genera de forma síncrona: encola y devuelve un `jobId`.
 * Durante la Casa Abierta la cola es lo que impide que cien peticiones a la vez
 * tumben al proveedor de imágenes.
 */
@Injectable()
export class GenerationQueueService {
  constructor(@InjectQueue(COLA_GENERACION) private readonly cola: Queue<DatosTrabajo>) {}

  /** Encola una generación y devuelve su identificador. */
  async encolar(dto: GenerarImagenDto): Promise<string> {
    const job = await this.cola.add('generar', dto, {
      // Un fallo del proveedor suele ser transitorio; el propio proveedor ya
      // reintenta internamente, así que aquí basta con un intento extra.
      attempts: 2,
      backoff: { type: 'exponential', delay: 3_000 },
      // Sin esto Redis crecería sin límite durante el evento.
      removeOnComplete: { age: 3_600, count: 500 },
      removeOnFail: { age: 3_600, count: 100 },
    });

    // BullMQ tipa el id como opcional, pero siempre existe salvo para trabajos
    // repetibles, que aquí no usamos.
    return job.id ?? '';
  }

  /** Consulta el estado de un trabajo. El frontend hace polling contra esto. */
  async estado(jobId: string): Promise<EstadoGeneracion> {
    const job = await this.cola.getJob(jobId);

    if (!job) {
      // El trabajo caducó (removeOnComplete) o el id no existe. No podemos
      // distinguirlo, así que lo tratamos igual.
      return {
        jobId,
        estado: 'desconocido',
        progreso: 0,
        etapa: 'No encontramos esta generación. Puede que haya caducado.',
      };
    }

    const estado = await job.getState();
    const progreso = this.leerProgreso(job.progress);

    switch (estado) {
      case 'completed':
        return {
          jobId,
          estado: 'completado',
          progreso: 100,
          etapa: '¡Listo!',
          resultado: job.returnvalue as GenerationDto,
        };

      case 'failed':
        return {
          jobId,
          estado: 'fallido',
          progreso: progreso.porcentaje,
          etapa: 'La generación falló.',
          error: job.failedReason ?? 'Error desconocido.',
        };

      case 'active':
        return {
          jobId,
          estado: 'procesando',
          progreso: progreso.porcentaje,
          etapa: progreso.etapa,
        };

      default: {
        // "waiting", "delayed", "waiting-children"…: aún no ha empezado.
        const posicion = await this.posicionEnCola(jobId);
        return {
          jobId,
          estado: 'en-cola',
          progreso: 0,
          etapa:
            posicion !== undefined && posicion > 0
              ? `En cola, ${posicion} por delante…`
              : 'En cola…',
          posicionEnCola: posicion,
        };
      }
    }
  }

  /** Cuántos trabajos hay por delante. Útil para dar feedback honesto. */
  private async posicionEnCola(jobId: string): Promise<number | undefined> {
    const esperando = await this.cola.getWaiting();
    const indice = esperando.findIndex((job) => job.id === jobId);
    return indice >= 0 ? indice : undefined;
  }

  /**
   * BullMQ tipa `progress` de forma amplia (number, string, boolean, objeto…);
   * nuestro worker siempre publica un `ProgresoTrabajo`, pero se comprueba
   * porque un trabajo antiguo en Redis podría traer otra forma.
   */
  private leerProgreso(progress: JobProgress): ProgresoTrabajo {
    if (typeof progress === 'object' && progress !== null && 'porcentaje' in progress) {
      return progress as ProgresoTrabajo;
    }
    return { porcentaje: 0, etapa: 'La IA está imaginando tu mundo…' };
  }
}
