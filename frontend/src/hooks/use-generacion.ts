'use client';

import { api, ApiError } from '@/services/api';
import type {
  EstadoGeneracion,
  EstilizarFotoRequest,
  GenerarImagenRequest,
} from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

/** Cada cuánto preguntamos al backend por el progreso. */
const INTERVALO_POLLING_MS = 1_000;

/** Los dos caminos que puede tomar una generación. */
type PeticionGeneracion =
  | { tipo: 'texto'; datos: GenerarImagenRequest }
  | { tipo: 'foto'; datos: EstilizarFotoRequest };

/**
 * Encola una generación y sigue su progreso.
 *
 * El backend responde al instante con un `jobId` y hace el trabajo en una cola,
 * así que aquí se sondea el estado en vez de esperar a una respuesta larga. Es
 * lo que permite mostrar una barra de progreso real y sobrevivir a una cola de
 * visitantes sin agotar conexiones HTTP.
 */
export function useGeneracion() {
  const [jobId, setJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Una sola mutación para los dos caminos: la cola y el polling de estado son
  // idénticos, solo cambia el endpoint que encola.
  const mutacion = useMutation({
    mutationFn: (peticion: PeticionGeneracion) =>
      peticion.tipo === 'texto'
        ? api.generar(peticion.datos)
        : api.estilizarFoto(peticion.datos),
    onSuccess: ({ jobId }) => setJobId(jobId),
  });

  const consulta = useQuery<EstadoGeneracion>({
    queryKey: ['generacion', jobId],
    queryFn: () => api.estadoGeneracion(jobId as string),
    // Sin jobId no hay nada que sondear.
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const estado = query.state.data?.estado;
      // Al terminar (bien o mal) se detiene el polling: seguir preguntando por
      // un trabajo acabado solo gasta peticiones.
      if (estado === 'completado' || estado === 'fallido' || estado === 'desconocido') {
        return false;
      }
      return INTERVALO_POLLING_MS;
    },
    // El progreso es efímero: no tiene sentido cachearlo entre montajes.
    gcTime: 0,
  });

  const estado = consulta.data;

  // Cuando una imagen se completa entra en la galería y el historial: se
  // invalidan para que aparezca sin recargar la página. Va en un efecto porque
  // invalidar durante el render provocaría actualizaciones en cascada.
  const completado = estado?.estado === 'completado';
  useEffect(() => {
    if (!completado) return;
    void queryClient.invalidateQueries({ queryKey: ['galeria'] });
    void queryClient.invalidateQueries({ queryKey: ['historial'] });
  }, [completado, queryClient]);

  const generar = useCallback(
    (request: GenerarImagenRequest) => {
      setJobId(null);
      mutacion.mutate({ tipo: 'texto', datos: request });
    },
    [mutacion],
  );

  const estilizarFoto = useCallback(
    (request: EstilizarFotoRequest) => {
      setJobId(null);
      mutacion.mutate({ tipo: 'foto', datos: request });
    },
    [mutacion],
  );

  const reiniciar = useCallback(() => {
    setJobId(null);
    mutacion.reset();
  }, [mutacion]);

  const errorDeEncolado =
    mutacion.error instanceof ApiError ? mutacion.error.message : null;

  return {
    generar,
    estilizarFoto,
    reiniciar,
    /** True desde que se pulsa el botón hasta que hay imagen o error. */
    generando:
      mutacion.isPending ||
      estado?.estado === 'en-cola' ||
      estado?.estado === 'procesando',
    progreso: estado?.progreso ?? (mutacion.isPending ? 5 : 0),
    etapa: estado?.etapa ?? 'Enviando tu idea…',
    posicionEnCola: estado?.posicionEnCola,
    resultado: estado?.estado === 'completado' ? estado.resultado : undefined,
    error: errorDeEncolado ?? (estado?.estado === 'fallido' ? estado.error : undefined),
  };
}
