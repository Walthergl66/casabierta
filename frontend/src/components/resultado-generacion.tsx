'use client';

import { VisorImagen } from '@/components/visor-imagen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ASPECTO_CSS, ETIQUETA_ESTILO } from '@/lib/catalogo';
import { descargarImagen } from '@/lib/descargar';
import type { Formato, Generacion } from '@/types/api';
import {
  AlertCircle,
  Copy,
  Download,
  Expand,
  ImageIcon,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  generando: boolean;
  progreso: number;
  etapa: string;
  resultado?: Generacion;
  error?: string;
  formato: Formato;
  onRegenerar: () => void;
}

/**
 * Panel derecho: muestra el estado de la generación y, al terminar, la imagen
 * con sus acciones.
 *
 * Los tres estados (cargando / error / resultado) comparten el mismo contenedor
 * con la proporción del formato elegido, así que la página no da saltos al
 * pasar de uno a otro.
 */
export function ResultadoGeneracion({
  generando,
  progreso,
  etapa,
  resultado,
  error,
  formato,
  onRegenerar,
}: Props) {
  const [visorAbierto, setVisorAbierto] = useState(false);

  // La imagen ya generada manda sobre el formato del formulario: si el usuario
  // cambia el selector después, el marco no debe deformarse.
  const aspecto = resultado
    ? `${resultado.width} / ${resultado.height}`
    : ASPECTO_CSS[formato];

  return (
    <div className="cristal overflow-hidden rounded-2xl">
      <div
        className="relative grid w-full place-items-center bg-black/30"
        style={{ aspectRatio: aspecto }}
      >
        {generando && <Cargando progreso={progreso} etapa={etapa} />}
        {!generando && error !== undefined && <Error mensaje={error} onReintentar={onRegenerar} />}
        {!generando && error === undefined && resultado === undefined && <Vacio />}

        {!generando && error === undefined && resultado !== undefined && (
          <button
            type="button"
            onClick={() => setVisorAbierto(true)}
            className="group relative size-full cursor-zoom-in"
            aria-label="Ver la imagen a pantalla completa"
          >
            <Image
              src={resultado.imageUrl}
              alt={resultado.promptOriginal}
              fill
              // Ocupa media pantalla en escritorio y toda en móvil.
              sizes="(max-width: 1024px) 100vw, 50vw"
              // Es el contenido principal de la página: cargarla con prioridad
              // mejora el momento en que el visitante por fin ve su imagen.
              priority
              className="object-contain"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
              <Expand className="size-8 text-white drop-shadow-lg" />
            </span>
          </button>
        )}
      </div>

      {resultado !== undefined && !generando && (
        <Acciones resultado={resultado} onRegenerar={onRegenerar} onExpandir={() => setVisorAbierto(true)} />
      )}

      {resultado !== undefined && (
        <VisorImagen
          generacion={resultado}
          abierto={visorAbierto}
          onOpenChange={setVisorAbierto}
        />
      )}
    </div>
  );
}

/** Skeleton con barra de progreso y barrido de luz. */
function Cargando({ progreso, etapa }: { progreso: number; etapa: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8">
      {/* Barrido de luz sobre el skeleton: comunica "trabajando" sin números. */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 animate-brillo bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <div className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-pulso-lento rounded-full bg-fuchsia-500/25 blur-xl" />
        <Sparkles className="relative size-8 animate-pulse text-fuchsia-300" />
      </div>

      <div className="relative w-full max-w-xs space-y-3 text-center">
        <p className="text-sm font-medium text-foreground/90">{etapa}</p>
        <Progress value={progreso} className="h-1.5 bg-white/10" />
        <p className="text-xs tabular-nums text-muted-foreground">{progreso}%</p>
      </div>
    </div>
  );
}

function Error({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <AlertCircle className="size-10 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">No pudimos crear tu imagen</p>
        <p className="max-w-xs text-sm text-muted-foreground">{mensaje}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onReintentar} className="gap-2">
        <RefreshCw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}

function Vacio() {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <ImageIcon className="size-10 text-muted-foreground/40" />
      <p className="max-w-xs text-sm text-muted-foreground">
        Tu imagen aparecerá aquí. Describe una idea y pulsa{' '}
        <span className="font-medium text-foreground/80">Generar imagen</span>.
      </p>
    </div>
  );
}

/** Barra inferior: metadatos y acciones sobre la imagen. */
function Acciones({
  resultado,
  onRegenerar,
  onExpandir,
}: {
  resultado: Generacion;
  onRegenerar: () => void;
  onExpandir: () => void;
}) {
  const [descargando, setDescargando] = useState(false);

  const copiarPrompt = async () => {
    await navigator.clipboard.writeText(
      resultado.promptMejorado ?? resultado.promptOriginal,
    );
    toast.success('Prompt copiado al portapapeles');
  };

  const compartir = async () => {
    // La Web Share API solo existe en móvil y en contextos seguros (HTTPS);
    // en escritorio se cae a copiar el enlace.
    if (navigator.share !== undefined) {
      try {
        await navigator.share({
          title: 'Mi imagen en DreamCanvas AI',
          text: resultado.promptOriginal,
          url: resultado.imageUrl,
        });
        return;
      } catch {
        // El usuario canceló el diálogo: no es un error que deba avisarse.
        return;
      }
    }

    await navigator.clipboard.writeText(resultado.imageUrl);
    toast.success('Enlace copiado al portapapeles');
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarImagen(resultado.imageUrl, resultado.promptOriginal);
    } catch {
      toast.error('No pudimos descargar la imagen. Inténtalo de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge variant="secondary" className="bg-white/10">
          {ETIQUETA_ESTILO[resultado.estilo]}
        </Badge>
        <Badge variant="secondary" className="bg-white/10">
          {resultado.width}×{resultado.height}
        </Badge>
        <Badge variant="secondary" className="bg-white/10">
          {resultado.proveedor}
        </Badge>
        <Badge variant="secondary" className="bg-white/10 tabular-nums">
          {(resultado.generationTime / 1000).toFixed(1)}s
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Button onClick={descargar} disabled={descargando} size="sm" className="gap-1.5">
          <Download className="size-4" />
          {descargando ? 'Bajando…' : 'Descargar'}
        </Button>
        <Button onClick={compartir} variant="secondary" size="sm" className="gap-1.5">
          <Share2 className="size-4" />
          Compartir
        </Button>
        <Button onClick={copiarPrompt} variant="secondary" size="sm" className="gap-1.5">
          <Copy className="size-4" />
          Prompt
        </Button>
        <Button onClick={onRegenerar} variant="secondary" size="sm" className="gap-1.5">
          <RefreshCw className="size-4" />
          Regenerar
        </Button>
        <Button
          onClick={onExpandir}
          variant="secondary"
          size="sm"
          className="col-span-2 gap-1.5 sm:col-span-1"
        >
          <Expand className="size-4" />
          Ampliar
        </Button>
      </div>
    </div>
  );
}
