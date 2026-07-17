import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../common/config/env';
import {
  PROMPT_ENHANCER,
  PromptEnhancer,
} from '../../interfaces/prompt-enhancer.interface';
import { AnthropicEnhancer } from './anthropic.enhancer';
import { HeuristicEnhancer } from './heuristic.enhancer';
import { OpenAIEnhancer } from './openai.enhancer';

/**
 * Selecciona el mejorador de prompt según `PROMPT_ENHANCER`.
 *
 * Mismo patrón que `imageProviderFactory`: el resto de la aplicación solo
 * conoce la interfaz.
 */
export const promptEnhancerFactory: Provider = {
  provide: PROMPT_ENHANCER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): PromptEnhancer => {
    const logger = new Logger('PromptEnhancerFactory');
    const seleccionado = config.get('PROMPT_ENHANCER', { infer: true });

    // `env.ts` ya ha validado que la clave existe para la opción elegida.
    const enhancer = ((): PromptEnhancer => {
      switch (seleccionado) {
        case 'openai':
          return new OpenAIEnhancer(config.get('OPENAI_API_KEY', { infer: true }) ?? '');
        case 'anthropic':
          return new AnthropicEnhancer(
            config.get('ANTHROPIC_API_KEY', { infer: true }) ?? '',
          );
        case 'none':
          return new HeuristicEnhancer();
      }
    })();

    logger.log(`Mejorador de prompt activo: ${enhancer.nombre}`);
    return enhancer;
  },
};
