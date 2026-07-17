'use client';

import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

/**
 * Estado del backend.
 *
 * Sirve para saber si la cámara está disponible: depende de que el backend
 * tenga configurado un proveedor de edición de pago, cosa que el frontend no
 * puede adivinar por su cuenta. Si no lo está, la pestaña de foto se oculta en
 * vez de dejar que el usuario se haga una foto para que luego falle.
 */
export function useSalud() {
  return useQuery({
    queryKey: ['salud'],
    queryFn: () => api.salud(),
    // La configuración del backend no cambia mientras el usuario navega.
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
