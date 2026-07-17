'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { descargarImagen } from '@/lib/descargar';
import type { Generacion } from '@/types/api';
import { Download } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface Props {
  generacion: Generacion;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
}

/**
 * Visor a pantalla completa.
 *
 * Muestra el prompt original y el optimizado juntos: es la parte más didáctica
 * de la demo — deja ver qué hizo exactamente la IA con la idea del visitante.
 */
export function VisorImagen({ generacion, abierto, onOpenChange }: Props) {
  const descargar = async () => {
    try {
      await descargarImagen(generacion.imageUrl, generacion.promptOriginal);
    } catch {
      toast.error('No pudimos descargar la imagen.');
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-[min(96vw,1400px)] gap-0 border-white/10 bg-background/95 p-0 backdrop-blur-2xl sm:max-w-[min(96vw,1400px)]"
      >
        {/* Radix exige un título accesible; aquí sobra visualmente, así que se
            oculta pero se mantiene para lectores de pantalla. */}
        <DialogTitle className="sr-only">
          Imagen generada: {generacion.promptOriginal}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista a pantalla completa con el prompt original y el optimizado.
        </DialogDescription>

        <div className="relative max-h-[72vh] min-h-[40vh] w-full bg-black/40">
          <Image
            src={generacion.imageUrl}
            alt={generacion.promptOriginal}
            width={generacion.width}
            height={generacion.height}
            sizes="96vw"
            className="mx-auto max-h-[72vh] w-auto object-contain"
          />
        </div>

        <div className="max-h-[24vh] space-y-4 overflow-y-auto border-t border-white/10 p-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prompt original
            </p>
            <p className="text-sm">{generacion.promptOriginal}</p>
          </div>

          {generacion.promptMejorado !== null && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-fuchsia-300/80">
                Prompt optimizado por IA
              </p>
              <p className="text-sm text-muted-foreground">{generacion.promptMejorado}</p>
            </div>
          )}

          <Button onClick={descargar} size="sm" className="gap-1.5">
            <Download className="size-4" />
            Descargar imagen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
