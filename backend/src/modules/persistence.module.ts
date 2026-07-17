import { Global, Module } from '@nestjs/common';
import { GalleryRepository } from '../repositories/gallery.repository';
import { GenerationRepository } from '../repositories/generation.repository';
import { PrismaService } from '../repositories/prisma.service';
import { PromptRepository } from '../repositories/prompt.repository';

/**
 * Acceso a datos.
 *
 * Es global porque `PrismaService` mantiene el pool de conexiones: una única
 * instancia para toda la aplicación, no una por módulo que lo importe.
 */
@Global()
@Module({
  providers: [PrismaService, PromptRepository, GenerationRepository, GalleryRepository],
  exports: [PrismaService, PromptRepository, GenerationRepository, GalleryRepository],
})
export class PersistenceModule {}
