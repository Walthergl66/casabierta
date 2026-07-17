import { Injectable, Logger } from '@nestjs/common';
import { ImageProviderError } from '../../common/errors/domain.errors';
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
 * Proveedor por defecto: Pollinations.ai.
 *
 * Es gratuito y no requiere API key, lo que lo hace el candidato natural para la
 * Casa Abierta: cientos de visitantes no agotan ningún crédito. A cambio puede
 * ir lento cuando su servicio está saturado, de ahí el timeout generoso.
 *
 * La API es un GET: el prompt viaja en la ruta y los parámetros en la query.
 */
@Injectable()
export class PollinationsProvider implements ImageProvider {
  readonly nombre = 'pollinations';

  private readonly logger = new Logger(PollinationsProvider.name);
  private readonly baseUrl = 'https://image.pollinations.ai/prompt';
  private readonly timeoutMs = 90_000;

  async generar(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const url = this.construirUrl(request);

    const respuesta = await conReintentos(
      async () => {
        const res = await fetchConTimeout(url, {
          method: 'GET',
          timeoutMs: this.timeoutMs,
          proveedor: this.nombre,
          headers: { Accept: 'image/*' },
        });

        if (!res.ok) {
          const detalle = await res.text().catch(() => '');
          throw new ImageProviderError(
            this.nombre,
            `Pollinations respondió ${res.status}.`,
            detalle.slice(0, 500),
          );
        }

        return res;
      },
      {
        intentos: 3,
        esperaBaseMs: 1_500,
        esReintentable: esErrorTransitorio,
        alReintentar: (intento, error) =>
          this.logger.warn(
            { intento, err: error },
            'Pollinations falló; reintentando…',
          ),
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
        model: 'flux',
        // Se guarda sin el prompt para no duplicar texto ya persistido aparte.
        bytes: bytes.byteLength,
      },
    };
  }

  private construirUrl(request: ImageGenerationRequest): string {
    const params = new URLSearchParams({
      width: String(request.width),
      height: String(request.height),
      model: 'flux',
      // Sin marca de agua y sin la pantalla intermedia de su web.
      nologo: 'true',
      private: 'true',
    });

    if (request.seed !== undefined) {
      params.set('seed', String(request.seed));
    }

    return `${this.baseUrl}/${encodeURIComponent(request.prompt)}?${params.toString()}`;
  }
}
