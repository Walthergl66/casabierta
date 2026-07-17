import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { PromptEnhancer } from '../../interfaces/prompt-enhancer.interface';
import { INSTRUCCION_MEJORA, construirPeticion } from './instruccion';

/**
 * Mejorador de prompt con Claude.
 *
 * El pensamiento extendido va desactivado y el esfuerzo en bajo a propósito:
 * hay un visitante mirando la pantalla, y reescribir un prompt no necesita
 * deliberación. Latencia por encima de matices.
 */
@Injectable()
export class AnthropicEnhancer implements PromptEnhancer {
  readonly nombre = 'anthropic';

  private readonly logger = new Logger(AnthropicEnhancer.name);
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async mejorar(promptOriginal: string, estilo: string): Promise<string> {
    try {
      const respuesta = await this.client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 400,
        system: INSTRUCCION_MEJORA,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: construirPeticion(promptOriginal, estilo) }],
      });

      if (respuesta.stop_reason === 'refusal') {
        this.logger.warn('Claude rechazó mejorar el prompt; se usa el original.');
        return promptOriginal;
      }

      const texto = respuesta.content
        .filter((bloque): bloque is Anthropic.TextBlock => bloque.type === 'text')
        .map((bloque) => bloque.text)
        .join('')
        .trim();

      return texto.length > 0 ? texto : promptOriginal;
    } catch (error) {
      // Mejorar es opcional: si falla, seguimos con el prompt original antes
      // que dejar al usuario sin imagen.
      this.logger.warn({ err: error }, 'Falló la mejora con Claude; se usa el prompt original.');
      return promptOriginal;
    }
  }
}
