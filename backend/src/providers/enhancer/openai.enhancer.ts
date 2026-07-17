import { Injectable, Logger } from '@nestjs/common';
import { PromptEnhancer } from '../../interfaces/prompt-enhancer.interface';
import { INSTRUCCION_MEJORA, construirPeticion } from './instruccion';

interface RespuestaChat {
  choices?: { message?: { content?: string } }[];
}

/**
 * Mejorador de prompt con GPT, vía la API de Chat Completions.
 *
 * Se usa `fetch` en vez del SDK de OpenAI: es una única llamada sencilla y no
 * merece añadir otra dependencia al backend.
 */
@Injectable()
export class OpenAIEnhancer implements PromptEnhancer {
  readonly nombre = 'openai';

  private readonly logger = new Logger(OpenAIEnhancer.name);
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';
  private readonly timeoutMs = 20_000;

  constructor(private readonly apiKey: string) {}

  async mejorar(promptOriginal: string, estilo: string): Promise<string> {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 400,
          temperature: 0.8,
          messages: [
            { role: 'system', content: INSTRUCCION_MEJORA },
            { role: 'user', content: construirPeticion(promptOriginal, estilo) },
          ],
        }),
      });

      if (!res.ok) {
        this.logger.warn(
          `OpenAI respondió ${res.status} al mejorar el prompt; se usa el original.`,
        );
        return promptOriginal;
      }

      const cuerpo = (await res.json()) as RespuestaChat;
      const texto = cuerpo.choices?.[0]?.message?.content?.trim();

      return texto && texto.length > 0 ? texto : promptOriginal;
    } catch (error) {
      // Mejorar es opcional: nunca debe impedir que se genere la imagen.
      this.logger.warn(
        { err: error },
        'Falló la mejora con OpenAI; se usa el prompt original.',
      );
      return promptOriginal;
    } finally {
      clearTimeout(temporizador);
    }
  }
}
