'use client';

import { Button } from '@/components/ui/button';
import { useCamara } from '@/hooks/use-camara';
import { AlertCircle, Camera, RefreshCw, SwitchCamera, X } from 'lucide-react';
import Image from 'next/image';

interface Props {
  /** Data URL de la foto ya capturada, o null si aún no hay ninguna. */
  foto: string | null;
  onFoto: (foto: string | null) => void;
}

/**
 * Cámara en vivo y captura.
 *
 * Tres estados: apagada (invitación), en vivo (previsualización + disparador) y
 * con foto hecha (revisar o repetir). La cámara se apaga en cuanto hay foto —
 * el piloto encendido de fondo pone nerviosa a la gente, y ya no hace falta.
 */
export function CapturaCamara({ foto, onFoto }: Props) {
  const camara = useCamara();

  const disparar = () => {
    const captura = camara.capturar();
    if (!captura) return;
    onFoto(captura);
    camara.cerrar();
  };

  const repetir = () => {
    onFoto(null);
    void camara.abrir();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="relative grid aspect-[4/3] w-full place-items-center">
        {/* ── Foto ya hecha ────────────────────────────────── */}
        {foto !== null && (
          <>
            <Image
              src={foto}
              alt="La foto que acabas de hacer"
              fill
              // Es una data URL local, no pasa por el optimizador de Next.
              unoptimized
              className="object-contain"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={repetir}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 gap-1.5 shadow-lg"
            >
              <RefreshCw className="size-4" />
              Repetir foto
            </Button>
          </>
        )}

        {/* ── Vídeo en vivo ────────────────────────────────── */}
        {foto === null && (
          <video
            ref={camara.videoRef}
            autoPlay
            playsInline
            muted
            className={
              camara.estado === 'lista'
                ? // Espejo: verse invertido es lo natural, como en un espejo real.
                  'size-full scale-x-[-1] object-cover'
                : 'hidden'
            }
          />
        )}

        {/* ── Apagada ──────────────────────────────────────── */}
        {foto === null && camara.estado === 'inactiva' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Camera className="size-10 text-muted-foreground/40" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Hazte una foto y la IA te convertirá en el estilo que elijas.
            </p>
            <Button type="button" onClick={() => void camara.abrir()} className="gap-2">
              <Camera className="size-4" />
              Abrir cámara
            </Button>
          </div>
        )}

        {foto === null && camara.estado === 'pidiendo-permiso' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Camera className="size-10 animate-pulse text-fuchsia-300" />
            <p className="text-sm text-muted-foreground">
              Permite el acceso a la cámara en tu navegador…
            </p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {foto === null && camara.estado === 'error' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <AlertCircle className="size-9 text-destructive" />
            <p className="max-w-sm text-sm text-muted-foreground">{camara.error}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void camara.abrir()}>
              Reintentar
            </Button>
          </div>
        )}

        {/* ── Controles en vivo ────────────────────────────── */}
        {foto === null && camara.estado === 'lista' && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={camara.cerrar}
              aria-label="Cerrar cámara"
              className="rounded-full"
            >
              <X className="size-4" />
            </Button>

            {/* Disparador grande y redondo: el patrón que todo el mundo
                reconoce de la app de cámara del móvil. */}
            <button
              type="button"
              onClick={disparar}
              aria-label="Hacer foto"
              className="grid size-16 place-items-center rounded-full border-4 border-white/90 bg-white/20 backdrop-blur transition-transform hover:scale-105 active:scale-95"
            >
              <span className="size-11 rounded-full bg-white" />
            </button>

            {camara.puedeCambiar ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => void camara.cambiarCamara()}
                aria-label="Cambiar de cámara"
                className="rounded-full"
              >
                <SwitchCamera className="size-4" />
              </Button>
            ) : (
              // Hueco fantasma: mantiene el disparador centrado cuando no hay
              // botón de cambiar cámara.
              <span aria-hidden className="size-9" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
