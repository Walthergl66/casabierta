import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GenerationController } from '../../controllers/generation.controller';
import { promptEnhancerFactory } from '../../providers/enhancer/enhancer.factory';
import {
  imageEditProviderFactory,
  imageProviderFactory,
} from '../../providers/image/image-provider.factory';
import {
  COLA_GENERACION,
  GenerationQueueService,
} from '../../services/generation-queue.service';
import { GenerationService } from '../../services/generation.service';
import { StorageService } from '../../services/storage.service';
import { PersistenceModule } from '../persistence.module';
import { GenerationProcessor } from './generation.processor';

/**
 * Generación de imágenes: API, cola, worker y proveedores.
 *
 * El controlador y el worker viven en el mismo proceso por sencillez. Si el
 * evento necesitara más capacidad, este módulo se puede desplegar aparte con
 * solo el `GenerationProcessor` y varias réplicas: la cola ya los desacopla.
 */
@Module({
  imports: [
    PersistenceModule,
    BullModule.registerQueue({ name: COLA_GENERACION }),
  ],
  controllers: [GenerationController],
  providers: [
    imageProviderFactory,
    imageEditProviderFactory,
    promptEnhancerFactory,
    StorageService,
    GenerationService,
    GenerationQueueService,
    GenerationProcessor,
  ],
  // El health controller consulta si la cámara está disponible.
  exports: [GenerationService],
})
export class GenerationModule {}
