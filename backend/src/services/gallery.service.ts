import { Injectable } from '@nestjs/common';
import {
  PRISMA_A_CALIDAD,
  PRISMA_A_ESTILO,
  PRISMA_A_FORMATO,
} from '../common/domain/catalogo';
import {
  EntradaGaleria,
  GalleryRepository,
  OrdenGaleria,
} from '../repositories/gallery.repository';

/** Una imagen de la galería, tal y como la consume el frontend. */
export interface ItemGaleriaDto {
  readonly id: string;
  readonly generationId: string;
  readonly imageUrl: string;
  readonly width: number;
  readonly height: number;
  readonly prompt: string;
  readonly estilo: string;
  readonly formato: string;
  readonly calidad: string;
  readonly proveedor: string;
  readonly likes: number;
  readonly views: number;
  readonly featured: boolean;
  readonly createdAt: string;
}

export interface PaginaGaleria {
  readonly items: ItemGaleriaDto[];
  readonly total: number;
  readonly limite: number;
  readonly offset: number;
  readonly hayMas: boolean;
}

/** Lógica de la galería pública. */
@Injectable()
export class GalleryService {
  constructor(private readonly gallery: GalleryRepository) {}

  async listar(
    orden: OrdenGaleria,
    limite: number,
    offset: number,
  ): Promise<PaginaGaleria> {
    const [entradas, total] = await Promise.all([
      this.gallery.listar(orden, limite, offset),
      this.gallery.total(),
    ]);

    return {
      items: entradas.map((entrada) => this.aDto(entrada)),
      total,
      limite,
      offset,
      // El orden aleatorio no pagina de forma coherente: cada petición barajaría
      // de nuevo y repetiría imágenes, así que no ofrecemos "cargar más".
      hayMas: orden !== 'aleatorias' && offset + entradas.length < total,
    };
  }

  async darLike(id: string): Promise<{ likes: number }> {
    const likes = await this.gallery.darLike(id);
    return { likes };
  }

  async registrarVista(id: string): Promise<void> {
    await this.gallery.registrarVista(id);
  }

  private aDto(entrada: EntradaGaleria): ItemGaleriaDto {
    const { generation } = entrada;

    return {
      id: entrada.id,
      generationId: generation.id,
      imageUrl: generation.imageUrl,
      width: generation.width,
      height: generation.height,
      // Se muestra el prompt mejorado si existe: describe mejor la imagen que
      // realmente se ve.
      prompt: generation.prompt.promptMejorado ?? generation.prompt.promptOriginal,
      estilo: PRISMA_A_ESTILO[generation.prompt.estilo],
      formato: PRISMA_A_FORMATO[generation.prompt.formato],
      calidad: PRISMA_A_CALIDAD[generation.prompt.calidad],
      proveedor: generation.prompt.proveedor,
      likes: entrada.likes,
      views: entrada.views,
      featured: entrada.featured,
      createdAt: entrada.createdAt.toISOString(),
    };
  }
}
