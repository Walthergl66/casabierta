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
import { conReintentos, esErrorTransitorio, fetchConTimeout } from './http.util';

interface RespuestaImagen {
  predictions?: {
    bytesBase64Encoded?: string;
    mimeType?: string;
    raiFilteredReason?: string;
  }[];
  error?: { message?: string; status?: string };
}

/**
 * Proveedor Google Imagen 3, vía la API de Generative Language.
 *
 * Como Stability, no acepta dimensiones libres: solo un `aspectRatio` de una
 * lista cerrada. La imagen vuelve en base64 dentro del JSON.
 */
@Injectable()
export class GoogleProvider implements ImageProvider {
  readonly nombre = 'google';

  private readonly logger = new Logger(GoogleProvider.name);
  private readonly modelo = 'imagen-3.0-generate-002';
  private readonly timeoutMs = 120_000;

  constructor(private readonly apiKey: string) {}

  async generar(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const aspectRatio = this.aspectRatio(request.width, request.height);
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:predict`;

    const respuesta = await conReintentos(
      async () => {
        const res = await fetchConTimeout(endpoint, {
          method: 'POST',
          timeoutMs: this.timeoutMs,
          proveedor: this.nombre,
          headers: {
            'Content-Type': 'application/json',
            // En cabecera y no en la query, para que la clave no acabe en logs de acceso.
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            instances: [{ prompt: request.prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio,
              personGeneration: 'allow_adult',
            },
          }),
        });

        const cuerpo = (await res.json().catch(() => ({}))) as RespuestaImagen;

        if (!res.ok) {
          throw new ImageProviderError(
            this.nombre,
            cuerpo.error?.message ?? `Google respondió ${res.status}.`,
            cuerpo.error,
          );
        }

        return cuerpo;
      },
      {
        intentos: 2,
        esperaBaseMs: 2_000,
        esReintentable: esErrorTransitorio,
        alReintentar: (intento, error) =>
          this.logger.warn({ intento, err: error }, 'Google falló; reintentando…'),
      },
    );

    const prediccion = respuesta.predictions?.[0];

    // Imagen no devuelve error HTTP cuando filtra: responde 200 con el motivo.
    if (prediccion?.raiFilteredReason) {
      throw new ContentPolicyError(
        'Google filtró este prompt por sus políticas de contenido. Prueba a reformularlo.',
      );
    }

    if (!prediccion?.bytesBase64Encoded) {
      throw new ContentPolicyError(
        'Google no devolvió ninguna imagen para este prompt. Prueba a reformularlo.',
      );
    }

    return {
      bytes: Buffer.from(prediccion.bytesBase64Encoded, 'base64'),
      mimeType: prediccion.mimeType ?? 'image/png',
      width: request.width,
      height: request.height,
      raw: { provider: this.nombre, model: this.modelo, aspectRatio },
    };
  }

  private aspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (ratio > 1.2) return '16:9';
    if (ratio < 0.83) return '9:16';
    return '1:1';
  }
}
