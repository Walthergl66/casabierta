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
import {
  conReintentos,
  esErrorTransitorio,
  fetchConTimeout,
  leerImagen,
} from './http.util';

/**
 * Proveedor Stability AI (Stable Image Core).
 *
 * Espera multipart/form-data, no JSON. No acepta ancho y alto libres: se le pasa
 * un `aspect_ratio` de una lista cerrada y él elige la resolución.
 */
@Injectable()
export class StabilityProvider implements ImageProvider {
  readonly nombre = 'stability';

  private readonly logger = new Logger(StabilityProvider.name);
  private readonly endpoint =
    'https://api.stability.ai/v2beta/stable-image/generate/core';
  private readonly timeoutMs = 120_000;

  constructor(private readonly apiKey: string) {}

  async generar(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const aspectRatio = this.aspectRatio(request.width, request.height);

    const respuesta = await conReintentos(
      async () => {
        const form = new FormData();
        form.append('prompt', request.prompt);
        form.append('aspect_ratio', aspectRatio);
        form.append('output_format', 'png');
        if (request.seed !== undefined) {
          form.append('seed', String(request.seed));
        }

        const res = await fetchConTimeout(this.endpoint, {
          method: 'POST',
          timeoutMs: this.timeoutMs,
          proveedor: this.nombre,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            // Sin esto devuelve JSON con la imagen en base64.
            Accept: 'image/*',
          },
          body: form,
        });

        if (!res.ok) {
          const detalle = await res.text().catch(() => '');

          if (res.status === 403) {
            throw new ContentPolicyError(
              'Stability rechazó este prompt por su filtro de contenido. Prueba a reformularlo.',
            );
          }

          throw new ImageProviderError(
            this.nombre,
            `Stability respondió ${res.status}.`,
            detalle.slice(0, 500),
          );
        }

        return res;
      },
      {
        intentos: 2,
        esperaBaseMs: 2_000,
        esReintentable: esErrorTransitorio,
        alReintentar: (intento, error) =>
          this.logger.warn({ intento, err: error }, 'Stability falló; reintentando…'),
      },
    );

    const { bytes, mimeType } = await leerImagen(respuesta, this.nombre);

    return {
      bytes,
      mimeType,
      width: request.width,
      height: request.height,
      raw: {
        provider: this.nombre,
        model: 'stable-image-core',
        aspect_ratio: aspectRatio,
        finish_reason: respuesta.headers.get('finish-reason'),
        seed: respuesta.headers.get('seed'),
      },
    };
  }

  private aspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (ratio > 1.2) return '16:9';
    if (ratio < 0.83) return '9:16';
    return '1:1';
  }
}
