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

/** Forma de la respuesta de /v1/images/generations que nos interesa. */
interface RespuestaOpenAI {
  data?: { b64_json?: string; revised_prompt?: string }[];
  error?: { message?: string; code?: string; type?: string };
  usage?: Record<string, unknown>;
}

/**
 * Proveedor OpenAI (gpt-image-1).
 *
 * Devuelve la imagen en base64 en el cuerpo JSON, no como binario.
 *
 * Ojo: el modelo solo acepta un conjunto cerrado de tamaños, así que la
 * resolución pedida se ajusta al más parecido en relación de aspecto.
 */
@Injectable()
export class OpenAIProvider implements ImageProvider {
  readonly nombre = 'openai';

  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly endpoint = 'https://api.openai.com/v1/images/generations';
  private readonly timeoutMs = 120_000;

  constructor(private readonly apiKey: string) {}

  async generar(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const size = this.tamanoSoportado(request.width, request.height);

    const respuesta = await conReintentos(
      async () => {
        const res = await fetchConTimeout(this.endpoint, {
          method: 'POST',
          timeoutMs: this.timeoutMs,
          proveedor: this.nombre,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: request.prompt,
            size: `${size.width}x${size.height}`,
            n: 1,
          }),
        });

        const cuerpo = (await res.json().catch(() => ({}))) as RespuestaOpenAI;

        if (!res.ok) {
          const mensaje = cuerpo.error?.message ?? `OpenAI respondió ${res.status}.`;

          // Un rechazo por contenido no se arregla reintentando: se corta aquí.
          if (
            res.status === 400 &&
            (cuerpo.error?.code === 'content_policy_violation' ||
              /safety|policy/i.test(mensaje))
          ) {
            throw new ContentPolicyError(
              'OpenAI rechazó este prompt por sus políticas de contenido. Prueba a reformularlo.',
            );
          }

          throw new ImageProviderError(this.nombre, mensaje, cuerpo.error);
        }

        return cuerpo;
      },
      {
        intentos: 2,
        esperaBaseMs: 2_000,
        esReintentable: esErrorTransitorio,
        alReintentar: (intento, error) =>
          this.logger.warn({ intento, err: error }, 'OpenAI falló; reintentando…'),
      },
    );

    const b64 = respuesta.data?.[0]?.b64_json;
    if (!b64) {
      throw new ImageProviderError(this.nombre, 'OpenAI no devolvió ninguna imagen.');
    }

    return {
      bytes: Buffer.from(b64, 'base64'),
      mimeType: 'image/png',
      width: size.width,
      height: size.height,
      raw: {
        provider: this.nombre,
        model: 'gpt-image-1',
        revised_prompt: respuesta.data?.[0]?.revised_prompt,
        usage: respuesta.usage,
      },
    };
  }

  /** gpt-image-1 solo admite 1024x1024, 1536x1024 y 1024x1536. */
  private tamanoSoportado(
    width: number,
    height: number,
  ): { width: number; height: number } {
    const ratio = width / height;
    if (ratio > 1.2) return { width: 1536, height: 1024 };
    if (ratio < 0.83) return { width: 1024, height: 1536 };
    return { width: 1024, height: 1024 };
  }
}
