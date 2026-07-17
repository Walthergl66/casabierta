'use client';

import { CapturaCamara } from '@/components/captura-camara';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OPCIONES_ESTILO } from '@/lib/catalogo';
import { cn } from '@/lib/utils';
import type { Estilo } from '@/types/api';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Props {
  onEstilizar: (foto: string, estilo: Estilo, nota: string) => void;
  generando: boolean;
}

const MAX_NOTA = 300;

/**
 * Pestaña «Foto»: cámara + selector de estilo.
 *
 * No hay selector de formato ni de calidad, a diferencia de la pestaña de
 * texto: el formato lo impone la propia foto, y la calidad la fija el proveedor
 * de edición. Enseñar controles que no hacen nada solo confunde.
 */
export function FormularioFoto({ onEstilizar, generando }: Props) {
  const [foto, setFoto] = useState<string | null>(null);
  const [estilo, setEstilo] = useState<Estilo>('anime');
  const [nota, setNota] = useState('');

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (foto === null) return;
    onEstilizar(foto, estilo, nota.trim());
  };

  return (
    <form onSubmit={enviar} className="cristal rounded-2xl p-5 sm:p-6">
      <CapturaCamara foto={foto} onFoto={setFoto} />

      {/* ── Estilo ───────────────────────────────────────────── */}
      <fieldset className="mt-5" disabled={foto === null}>
        <legend
          className={cn(
            'mb-2 text-sm font-medium transition-opacity',
            foto === null && 'opacity-40',
          )}
        >
          ¿En qué te quieres convertir?
        </legend>

        <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', foto === null && 'opacity-40')}>
          {OPCIONES_ESTILO.map((opcion) => {
            const activo = estilo === opcion.valor;
            return (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setEstilo(opcion.valor)}
                aria-pressed={activo}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all',
                  activo
                    ? 'border-primary/60 bg-primary/15 text-foreground shadow-[0_0_0_1px_var(--primary)]'
                    : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.07] hover:text-foreground',
                )}
              >
                <span aria-hidden>{opcion.emoji}</span>
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Nota opcional ────────────────────────────────────── */}
      <div className={cn('mt-5 space-y-2', foto === null && 'opacity-40')}>
        <Label htmlFor="nota" className="text-sm font-medium">
          Algo más que añadir{' '}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="nota"
          rows={2}
          disabled={foto === null}
          maxLength={MAX_NOTA}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ponme una armadura de samurái, fondo de galaxia…"
          className="resize-none border-white/10 bg-black/25 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
        />
      </div>

      {/* ── Aviso de privacidad ──────────────────────────────── */}
      <p className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
        <span>
          Tu foto original no se guarda en ningún sitio: solo se usa para crear la
          imagen. El resultado <strong className="font-medium text-foreground/80">no</strong>{' '}
          aparece en la galería pública — es solo para ti.
        </span>
      </p>

      <Button
        type="submit"
        size="lg"
        disabled={generando || foto === null}
        className="mt-5 h-14 w-full gap-2 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-base font-semibold shadow-lg shadow-violet-600/25 transition-all hover:brightness-110 hover:shadow-violet-600/40 disabled:opacity-50"
      >
        {generando ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Transformando…
          </>
        ) : (
          <>
            <Sparkles className="size-5" />
            {foto === null ? 'Hazte una foto primero' : 'Transformarme'}
          </>
        )}
      </Button>
    </form>
  );
}
