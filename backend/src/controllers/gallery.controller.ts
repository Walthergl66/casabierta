import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { GalleryService, PaginaGaleria } from '../services/gallery.service';

const galeriaQuerySchema = z.object({
  orden: z.enum(['recientes', 'populares', 'aleatorias']).default('recientes'),
  limite: z.coerce.number().int().min(1).max(48).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

/** API de la galería pública. */
@Controller('api/gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  async listar(@Query() query: unknown): Promise<PaginaGaleria> {
    const { orden, limite, offset } = galeriaQuerySchema.parse(query);
    return this.gallery.listar(orden, limite, offset);
  }

  /**
   * Suma un like.
   *
   * No hay control de duplicados a propósito: exigir cuenta de usuario en una
   * Casa Abierta arruinaría la experiencia, y el peor caso es un contador
   * inflado en una galería decorativa.
   */
  @Post(':id/like')
  async darLike(@Param('id') id: string): Promise<{ likes: number }> {
    return this.gallery.darLike(id);
  }

  /** Registra una visualización. Devuelve 204: al cliente no le sirve el total. */
  @Post(':id/view')
  @HttpCode(204)
  async registrarVista(@Param('id') id: string): Promise<void> {
    await this.gallery.registrarVista(id);
  }
}
