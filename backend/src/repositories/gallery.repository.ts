import { Injectable } from '@nestjs/common';
import { Gallery, Prompt } from '../generated/prisma/client';
import { GenerationConPrompt } from './generation.repository';
import { PrismaService } from './prisma.service';

/** Criterios de ordenación de la galería pública. */
export type OrdenGaleria = 'recientes' | 'populares' | 'aleatorias';

export type EntradaGaleria = Gallery & {
  generation: GenerationConPrompt;
};

/** Acceso a la tabla `gallery`. */
@Injectable()
export class GalleryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(orden: OrdenGaleria, limite: number, offset: number): Promise<EntradaGaleria[]> {
    if (orden === 'aleatorias') {
      return this.aleatorias(limite);
    }

    return this.prisma.gallery.findMany({
      take: limite,
      skip: offset,
      orderBy:
        orden === 'populares'
          ? // A igualdad de likes, la más nueva primero: sin el segundo criterio
            // el orden sería inestable y la paginación repetiría o saltaría filas.
            [{ likes: 'desc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }],
      include: { generation: { include: { prompt: true } } },
    });
  }

  /**
   * Selección aleatoria.
   *
   * Usa `ORDER BY random()`, que hace un escaneo completo de la tabla. Es
   * perfectamente aceptable para el volumen de una Casa Abierta (miles de filas
   * como mucho); si la galería creciera mucho, habría que cambiar a un muestreo
   * por id.
   */
  private async aleatorias(limite: number): Promise<EntradaGaleria[]> {
    const ids = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM gallery ORDER BY random() LIMIT ${limite}
    `;

    if (ids.length === 0) return [];

    const entradas = await this.prisma.gallery.findMany({
      where: { id: { in: ids.map((fila) => fila.id) } },
      include: { generation: { include: { prompt: true } } },
    });

    // `findMany` con `in` no conserva el orden aleatorio que acabamos de
    // calcular, así que lo reaplicamos aquí.
    const porId = new Map(entradas.map((entrada) => [entrada.id, entrada]));
    return ids
      .map((fila) => porId.get(fila.id))
      .filter((entrada): entrada is EntradaGaleria => entrada !== undefined);
  }

  async total(): Promise<number> {
    return this.prisma.gallery.count();
  }

  /** Suma un like. Devuelve el total actualizado. */
  async darLike(id: string): Promise<number> {
    const actualizada = await this.prisma.gallery.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });
    return actualizada.likes;
  }

  /** Suma una visualización, sin devolver nada: es información secundaria. */
  async registrarVista(id: string): Promise<void> {
    await this.prisma.gallery.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }
}
