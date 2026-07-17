'use client';

import { VisorImagen } from '@/components/visor-imagen';
import { Skeleton } from '@/components/ui/skeleton';
import { useHistorial } from '@/hooks/use-galeria';
import { tiempoRelativo } from '@/lib/fecha';
import type { Generacion } from '@/types/api';
import { Clock } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

/**
 * Historial de las últimas generaciones.
 *
 * Viene del servidor, no de localStorage: durante la Casa Abierta se comparte
 * un puñado de equipos, y lo interesante es ver lo que acaba de crear la gente
 * que pasó antes, no lo que creó este navegador.
 */
export function Historial() {
  const { data: generaciones, isLoading } = useHistorial(12);
  const [seleccionada, setSeleccionada] = useState<Generacion | null>(null);

  // Sin nada que mostrar, la sección entera desaparece: un carrusel vacío
  // al arrancar el evento solo estorbaría.
  if (!isLoading && (generaciones === undefined || generaciones.length === 0)) {
    return null;
  }

  return (
    <section className="mt-12 sm:mt-16">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Clock className="size-4 text-muted-foreground" />
        Creaciones recientes
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl bg-white/5" />
            ))
          : generaciones?.map((generacion) => (
              <button
                key={generacion.id}
                type="button"
                onClick={() => setSeleccionada(generacion)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30 transition-all hover:border-white/25 hover:ring-2 hover:ring-primary/40"
              >
                <Image
                  src={generacion.imageUrl}
                  alt={generacion.promptOriginal}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Los metadatos aparecen al pasar por encima: en reposo la
                    rejilla es solo imágenes, que es lo que se quiere mirar. */}
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 to-transparent p-2 text-left transition-transform duration-200 group-hover:translate-y-0">
                  <span className="line-clamp-2 block text-[11px] leading-tight text-white/90">
                    {generacion.promptOriginal}
                  </span>
                  <span className="mt-1 block text-[10px] text-white/50">
                    {generacion.proveedor} ·{' '}
                    {(generacion.generationTime / 1000).toFixed(1)}s ·{' '}
                    {tiempoRelativo(generacion.createdAt)}
                  </span>
                </span>
              </button>
            ))}
      </div>

      {seleccionada !== null && (
        <VisorImagen
          generacion={seleccionada}
          abierto
          onOpenChange={(abierto) => {
            if (!abierto) setSeleccionada(null);
          }}
        />
      )}
    </section>
  );
}
