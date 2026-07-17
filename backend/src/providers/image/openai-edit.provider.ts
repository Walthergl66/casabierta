import { Injectable, Logger } from '@nestjs/common';
import {
  ContentPolicyError,
  ImageProviderError,
} from '../../common/errors/domain.errors';
import {
  ImageEditProvider,
  ImageEditRequest,
  ImageGenerationResult,
} from '../../interfaces/image-provider.interface';
import { fetchConTimeout } from './http.util';

interface RespuestaOpenAI {
  data?: { b64_json?: string }[];
  error?: { message?: string; code?: string; type?: string };
  usage?: Record<string, unknown>;
}

/**
 * Estiliza fotos con gpt-image-1 (endpoint `/v1/images/edits`).
 *
 * Es el único proveedor de edición implementado: Pollinations, que es el que
 * genera el texto, no sabe hacerlo (ignora la imagen de entrada).
 *
 * No hay reintentos a propósito: cada llamada cuesta dinero, y un fallo aquí
 * suele ser la política de contenido o una clave mal puesta — reintentar solo
 * gastaría el doble para volver a fallar.
 */
@Injectable()
export class OpenAIEditProvider implements ImageEditProvider {
  readonly nombre = 'openai';

  private readonly logger = new Logger(OpenAIEditProvider.name);
  private readonly endpoint = 'https://api.openai.com/v1/images/edits';
  private readonly timeoutMs = 180_000;

  constructor(private readonly apiKey: string) {}

  async editar(request: ImageEditRequest): Promise<ImageGenerationResult> {
    const size = this.tamanoSoportado(request.width, request.height);

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', request.prompt);
    form.append('size', `${size.width}x${size.height}`);
    form.append('n', '1');
    // Sin esto el modelo reinventa la cara y el visitante no se reconoce, que
    // es justo lo único que importa en una foto de retrato.
    form.append('input_fidelity', 'high');
    form.append(
      'image',
      new Blob([new Uint8Array(request.imagen)], { type: request.mimeType }),
      `foto.${request.mimeType === 'image/png' ? 'png' : 'jpg'}`,
    );

    const res = await fetchConTimeout(this.endpoint, {
      method: 'POST',
      timeoutMs: this.timeoutMs,
      proveedor: this.nombre,
      // Sin Content-Type: fetch pone el boundary del multipart por su cuenta.
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    const cuerpo = (await res.json().catch(() => ({}))) as RespuestaOpenAI;

    if (!res.ok) {
      throw this.traducirError(res.status, cuerpo);
    }

    const b64 = cuerpo.data?.[0]?.b64_json;
    if (!b64) {
      throw new ImageProviderError(this.nombre, 'OpenAI no devolvió ninguna imagen.');
    }

    this.logger.log(`Foto estilizada con gpt-image-1 (${size.width}x${size.height}).`);

    return {
      bytes: Buffer.from(b64, 'base64'),
      mimeType: 'image/png',
      width: size.width,
      height: size.height,
      raw: { provider: this.nombre, model: 'gpt-image-1', usage: cuerpo.usage },
    };
  }

  /** Traduce el error de OpenAI a algo que el visitante pueda entender. */
  private traducirError(status: number, cuerpo: RespuestaOpenAI): Error {
    const mensaje = cuerpo.error?.message ?? `OpenAI respondió ${status}.`;

    // Rechazo por contenido: es el caso más probable con fotos de personas.
    if (
      cuerpo.error?.code === 'content_policy_violation' ||
      cuerpo.error?.code === 'moderation_blocked' ||
      /safety|policy|moderation/i.test(mensaje)
    ) {
      return new ContentPolicyError(
        'OpenAI rechazó esta foto por sus políticas de contenido. Prueba con otra foto u otro estilo.',
      );
    }

    if (status === 401) {
      return new ImageProviderError(
        this.nombre,
        'La clave de OpenAI no es válida. Revisa OPENAI_API_KEY.',
        cuerpo.error,
      );
    }

    if (status === 429) {
      return new ImageProviderError(
        this.nombre,
        'OpenAI está saturado o se agotó tu cuota. Inténtalo en un momento.',
        cuerpo.error,
      );
    }

    return new ImageProviderError(this.nombre, mensaje, cuerpo.error);
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
