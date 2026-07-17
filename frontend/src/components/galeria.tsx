'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDarLike, useGaleria } from '@/hooks/use-galeria';
import { ETIQUETA_ESTILO } from '@/lib/catalogo';
import { tiempoRelativo } from '@/lib/fecha';
import { cn } from '@/lib/utils';
import type { ItemGaleria, OrdenGaleria } from '@/types/api';
import { Heart, ImageOff, Loader2, Shuffle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const PESTANAS: { valor: OrdenGaleria; etiqueta: string }[] = [
  { valor: 'recientes', etiqueta: 'Recientes' },
  { valor: 'populares', etiqueta: 'Populares' },
  { valor: 'aleatorias', etiqueta: 'Aleatorias' },
];

/** Galería pública con pestañas de orden y scroll infinito. */
export function Galeria() {
  const [orden, setOrden] = useState<OrdenGaleria>('recientes');
  const consulta = useGaleria(orden);

  const items = consulta.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const total = consulta.data?.pages[0]?.total ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Galería <span className="texto-degradado">pública</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {total > 0
              ? `${total} ${total === 1 ? 'imagen creada' : 'imágenes creadas'} por la comunidad.`
              : 'Todo lo que ha imaginado la comunidad.'}
          </p>
        </div>

        <Tabs value={orden} onValueChange={(valor) => setOrden(valor as OrdenGaleria)}>
          <TabsList className="bg-white/5">
            {PESTANAS.map((pestana) => (
              <TabsTrigger key={pestana.valor} value={pestana.valor} className="text-xs sm:text-sm">
                {pestana.valor === 'aleatorias' && <Shuffle className="mr-1.5 size-3.5" />}
                {pestana.etiqueta}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {consulta.isLoading ? (
        <RejillaSkeleton />
      ) : items.length === 0 ? (
        <Vacia />
      ) : (
        <>
          {/* Columnas CSS: cada imagen conserva su proporción y encajan sin
              huecos, como en Pinterest. Es lo que mejor sienta a una mezcla de
              formatos 1:1, 16:9 y 9:16. */}
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {items.map((item) => (
              <TarjetaGaleria key={item.id} item={item} />
            ))}
          </div>

          {consulta.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void consulta.fetchNextPage()}
                disabled={consulta.isFetchingNextPage}
                className="gap-2"
              >
                {consulta.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaGaleria({ item }: { item: ItemGaleria }) {
  const darLike = useDarLike();

  // El "ya le di like" es local y efímero a propósito: no hay cuentas de
  // usuario, así que solo sirve para evitar que la misma persona pulse dos
  // veces seguidas y para pintar el corazón al instante.
  const [conLike, setConLike] = useState(false);

  const pulsarLike = () => {
    if (conLike) return;
    setConLike(true);
    darLike.mutate(item.id, {
      onError: () => setConLike(false),
    });
  };

  return (
    <figure className="group relative break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <Image
        src={item.imageUrl}
        alt={item.prompt}
        width={item.width}
        height={item.height}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
      />

      <figcaption className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="line-clamp-3 text-xs leading-snug text-white/90">{item.prompt}</p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="bg-white/15 text-[10px] text-white">
              {ETIQUETA_ESTILO[item.estilo]}
            </Badge>
            <span className="text-[10px] text-white/50">
              {tiempoRelativo(item.createdAt)}
            </span>
          </div>

          <button
            type="button"
            onClick={pulsarLike}
            aria-label={conLike ? 'Ya te gusta' : 'Me gusta'}
            // El resto de la superposición ignora el ratón para no bloquear el
            // hover; el corazón necesita recuperarlo.
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <Heart
              className={cn(
                'size-3.5 transition-all',
                conLike ? 'scale-110 fill-rose-500 text-rose-500' : 'text-white',
              )}
            />
            <span className="tabular-nums">{item.likes + (conLike ? 1 : 0)}</span>
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

function RejillaSkeleton() {
  // Alturas variadas para que el esqueleto insinúe la retícula irregular real.
  const alturas = [220, 300, 180, 260, 340, 200, 280, 240];

  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
      {alturas.map((altura, i) => (
        <Skeleton
          key={i}
          className="w-full break-inside-avoid rounded-xl bg-white/5"
          style={{ height: altura }}
        />
      ))}
    </div>
  );
}

function Vacia() {
  return (
    <div className="cristal flex flex-col items-center gap-3 rounded-2xl px-6 py-20 text-center">
      <ImageOff className="size-10 text-muted-foreground/40" />
      <p className="font-medium">La galería está vacía</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Todavía nadie ha creado nada. ¡Sé el primero en imaginar algo!
      </p>
    </div>
  );
}
