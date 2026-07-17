import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../common/config/env';
import {
  IMAGE_EDIT_PROVIDER,
  IMAGE_PROVIDER,
  ImageEditProvider,
  ImageProvider,
} from '../../interfaces/image-provider.interface';
import { FluxProvider } from './flux.provider';
import { GoogleProvider } from './google.provider';
import { OpenAIEditProvider } from './openai-edit.provider';
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

/**
 * Selecciona el proveedor de edición según `IMAGE_EDIT_PROVIDER`.
 *
 * Devuelve `null` cuando vale "none": la función de cámara es opcional y no
 * debe impedir que arranque el backend. Los servicios comprueban el null y el
 * frontend oculta la pestaña de foto si `/api/health` dice que está apagada.
 */
export const imageEditProviderFactory: Provider = {
  provide: IMAGE_EDIT_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): ImageEditProvider | null => {
    const logger = new Logger('ImageEditProviderFactory');
    const seleccionado = config.get('IMAGE_EDIT_PROVIDER', { infer: true });

    if (seleccionado === 'none') {
      logger.log(
        'Edición de fotos DESACTIVADA. Para activarla: IMAGE_EDIT_PROVIDER=openai + OPENAI_API_KEY.',
      );
      return null;
    }

    // `env.ts` ya ha verificado que la clave existe.
    const provider = new OpenAIEditProvider(
      config.get('OPENAI_API_KEY', { infer: true }) ?? '',
    );

    logger.log(`Proveedor de edición de fotos activo: ${provider.nombre} (de pago).`);
    return provider;
  },
};
