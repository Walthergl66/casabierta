import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../common/config/env';
import {
  IMAGE_PROVIDER,
  ImageProvider,
} from '../../interfaces/image-provider.interface';
import { FluxProvider } from './flux.provider';
import { GoogleProvider } from './google.provider';
import { OpenAIProvider } from './openai.provider';
import { PollinationsProvider } from './pollinations.provider';
import { StabilityProvider } from './stability.provider';

/**
 * Selecciona el proveedor activo a partir de `IMAGE_PROVIDER`.
 *
 * Este es el único punto del código que conoce todas las implementaciones. El
 * resto de la aplicación pide el token `IMAGE_PROVIDER` y recibe algo que cumple
 * la interfaz, sin saber cuál es.
 *
 * Para añadir un proveedor: implementa `ImageProvider`, añádelo al `switch` y
 * mete su nombre en el enum de `IMAGE_PROVIDER` en `env.ts`. Nada más.
 */
export const imageProviderFactory: Provider = {
  provide: IMAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): ImageProvider => {
    const logger = new Logger('ImageProviderFactory');
    const seleccionado = config.get('IMAGE_PROVIDER', { infer: true });

    // `env.ts` ya ha verificado que la clave del proveedor elegido existe, así
    // que aquí el `?? ''` solo satisface al compilador.
    const provider = ((): ImageProvider => {
      switch (seleccionado) {
        case 'openai':
          return new OpenAIProvider(
            config.get('OPENAI_API_KEY', { infer: true }) ?? '',
          );
        case 'google':
          return new GoogleProvider(
            config.get('GOOGLE_API_KEY', { infer: true }) ?? '',
          );
        case 'flux':
          return new FluxProvider(config.get('FLUX_API_KEY', { infer: true }) ?? '');
        case 'stability':
          return new StabilityProvider(
            config.get('STABILITY_API_KEY', { infer: true }) ?? '',
          );
        case 'pollinations':
          return new PollinationsProvider();
      }
    })();

    logger.log(`Proveedor de imágenes activo: ${provider.nombre}`);
    return provider;
  },
};
