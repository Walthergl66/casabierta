import { Galeria } from '@/components/galeria';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Galería — DreamCanvas AI',
  description:
    'Todas las imágenes creadas por la comunidad del Club de Inteligencia Artificial.',
};

export default function PaginaGaleria() {
  return <Galeria />;
}
