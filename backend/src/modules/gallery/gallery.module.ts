import { Module } from '@nestjs/common';
import { GalleryController } from '../../controllers/gallery.controller';
import { GalleryService } from '../../services/gallery.service';
import { PersistenceModule } from '../persistence.module';

/** Galería pública. */
@Module({
  imports: [PersistenceModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
