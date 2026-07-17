'use client';

import { api } from '@/services/api';
import type { OrdenGaleria, PaginaGaleria } from '@/types/api';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

const POR_PAGINA = 24;

/**
 * Galería pública con scroll infinito.
 *
 * El orden aleatorio no pagina: cada petición baraja de nuevo, así que pedir
 * una segunda página repetiría imágenes. El backend lo refleja devolviendo
 * `hayMas: false` para ese orden.
 */
export function useGaleria(orden: OrdenGaleria) {
  return useInfiniteQuery<PaginaGaleria>({
    queryKey: ['galeria', orden],
    queryFn: ({ pageParam }) => api.galeria(orden, POR_PAGINA, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (ultima) =>
      ultima.hayMas ? ultima.offset + ultima.items.length : undefined,
    staleTime: 30_000,
  });
}

/** Historial: las generaciones más recientes. */
export function useHistorial(limite = 12) {
  return useQuery({
    queryKey: ['historial', limite],
    queryFn: () => api.historial(limite),
    staleTime: 30_000,
  });
}

/** Ideas aleatorias para el botón "Inspirarme". */
export function useInspiracion() {
  return useMutation({
    mutationFn: () => api.inspiracion(),
  });
}

/**
 * Da like a una imagen de la galería.
 *
 * El componente pinta el corazón lleno al instante por su cuenta; aquí solo se
 * refresca la galería al terminar para que el contador cuadre con el servidor.
 */
export function useDarLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.darLike(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['galeria'] });
    },
  });
}
