import { Injectable, Logger } from '@nestjs/common';
import {
  ContentPolicyError,
  ImageProviderError,
} from '../../common/errors/domain.errors';
import {
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
} from '../../interfaces/image-provider.interface';
import { fetchConTimeout, leerImagen } from './http.util';

interface RespuestaEnvio {
  id?: string;
  polling_url?: string;
  detail?: unknown;
}

interface RespuestaSondeo {
  status?: string;
  result?: { sample?: string };
  details?: unknown;
}

/**
 * Proveedor FLUX (Black Forest Labs).
 *
 * A diferencia del resto, su API es asíncrona: el POST devuelve un id y hay que
 * sondear hasta que el estado sea "Ready". Entonces entrega una URL firmada y
 * temporal, que descargamos antes de que caduque.
 */
@Injectable()
export class FluxProvider implements ImageProvider {
  readonly nombre = 'flux';

  private readonly logger = new Logger(FluxProvider.name);
  private readonly baseUrl = 'https://api.bfl.ai/v1';
  private readonly modelo = 'flux-dev';
  private readonly intervaloSondeoMs = 1_500;
  private readonly limiteSondeoMs = 120_000;

  constructor(private readonly apiKey: string) {}

  async generar(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const pollingUrl = await this.enviarTrabajo(request);
    const sampleUrl = await this.esperarResultado(pollingUrl);

    const res = await fetchConTimeout(sampleUrl, {
      method: 'GET',
      timeoutMs: 60_000,
      proveedor: this.nombre,
      headers: { Accept: 'image/*' },
    });

    if (!res.ok) {
      throw new ImageProviderError(
        this.nombre,
        `No se pudo descargar la imagen de FLUX (${res.status}).`,
      );
    }

    const { bytes, mimeType } = await leerImagen(res, this.nombre);

    return {
      bytes,
      mimeType,
      width: request.width,
      height: request.height,
      raw: { provider: this.nombre, model: this.modelo },
    };
  }

  /** Encola la generación y devuelve la URL de sondeo. */
  private async enviarTrabajo(request: ImageGenerationRequest): Promise<string> {
    const res = await fetchConTimeout(`${this.baseUrl}/${this.modelo}`, {
      method: 'POST',
      timeoutMs: 30_000,
      proveedor: this.nombre,
      headers: {
        'Content-Type': 'application/json',
        'x-key': this.apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        // FLUX exige múltiplos de 32.
        width: redondearA32(request.width),
        height: redondearA32(request.height),
        ...(request.seed !== undefined ? { seed: request.seed } : {}),
      }),
    });

    const cuerpo = (await res.json().catch(() => ({}))) as RespuestaEnvio;

    if (!res.ok || !cuerpo.polling_url) {
      throw new ImageProviderError(
        this.nombre,
        `FLUX rechazó la petición (${res.status}).`,
        cuerpo.detail,
      );
    }

    return cuerpo.polling_url;
  }

  /** Sondea hasta que el trabajo esté listo, falle o se agote el tiempo. */
  private async esperarResultado(pollingUrl: string): Promise<string> {
    const limite = Date.now() + this.limiteSondeoMs;

    while (Date.now() < limite) {
      const res = await fetchConTimeout(pollingUrl, {
        method: 'GET',
        timeoutMs: 15_000,
        proveedor: this.nombre,
        headers: { 'x-key': this.apiKey, Accept: 'application/json' },
      });

      const cuerpo = (await res.json().catch(() => ({}))) as RespuestaSondeo;

      switch (cuerpo.status) {
        case 'Ready': {
          const sample = cuerpo.result?.sample;
          if (!sample) {
            throw new ImageProviderError(
              this.nombre,
              'FLUX marcó el trabajo como listo pero no devolvió imagen.',
            );
          }
          return sample;
        }

        case 'Content Moderated':
        case 'Request Moderated':
          throw new ContentPolicyError(
            'FLUX rechazó este prompt por su filtro de contenido. Prueba a reformularlo.',
          );

        case 'Error':
        case 'Task not found':
          throw new ImageProviderError(
            this.nombre,
            'FLUX no pudo completar la generación.',
            cuerpo.details,
          );

        default:
          // "Pending" o "Request Moderated" aún en curso: seguimos esperando.
          await new Promise((r) => setTimeout(r, this.intervaloSondeoMs));
      }
    }

    throw new ImageProviderError(
      this.nombre,
      `FLUX no terminó en ${this.limiteSondeoMs / 1000}s.`,
    );
  }
}

function redondearA32(valor: number): number {
  return Math.max(256, Math.round(valor / 32) * 32);
}
