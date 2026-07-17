'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInspiracion } from '@/hooks/use-galeria';
import {
  formularioSchema,
  OPCIONES_CALIDAD,
  OPCIONES_ESTILO,
  OPCIONES_FORMATO,
  VALORES_INICIALES,
  type FormularioValores,
} from '@/lib/catalogo';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface Props {
  onGenerar: (valores: FormularioValores) => void;
  generando: boolean;
}

const MAX_CARACTERES = 1000;

/** Formulario principal: prompt, estilo, formato, calidad y mejora automática. */
export function FormularioPrompt({ onGenerar, generando }: Props) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormularioValores>({
    resolver: zodResolver(formularioSchema),
    defaultValues: VALORES_INICIALES,
    mode: 'onSubmit',
  });

  const inspiracion = useInspiracion();
  const prompt = watch('prompt');

  const inspirarme = () => {
    inspiracion.mutate(undefined, {
      onSuccess: ({ ideas }) => {
        const idea = ideas[0];
        if (!idea) return;
        // `shouldValidate` limpia el error de "campo vacío" si lo hubiera.
        setValue('prompt', idea, { shouldValidate: true, shouldDirty: true });
      },
      onError: () =>
        toast.error('No pudimos traer ideas ahora mismo. Escribe la tuya.'),
    });
  };

  return (
    <form onSubmit={handleSubmit(onGenerar)} className="cristal rounded-2xl p-5 sm:p-6">
      {/* ── Prompt ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="prompt" className="text-sm font-medium">
            Describe tu idea
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={inspirarme}
            disabled={inspiracion.isPending}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {inspiracion.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Lightbulb className="size-3.5" />
            )}
            Inspirarme
          </Button>
        </div>

        <Controller
          control={control}
          name="prompt"
          render={({ field }) => (
            <Textarea
              {...field}
              id="prompt"
              rows={3}
              maxLength={MAX_CARACTERES}
              placeholder="Un gato astronauta comiendo pizza en Marte con estilo Pixar…"
              aria-invalid={errors.prompt !== undefined}
              className="resize-none border-white/10 bg-black/25 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
            />
          )}
        />

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-destructive">{errors.prompt?.message}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground/70">
            {prompt.length}/{MAX_CARACTERES}
          </span>
        </div>
      </div>

      {/* ── Estilo ───────────────────────────────────────────── */}
      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Estilo</legend>
        <Controller
          control={control}
          name="estilo"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPCIONES_ESTILO.map((opcion) => {
                const activo = field.value === opcion.valor;
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => field.onChange(opcion.valor)}
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
          )}
        />
      </fieldset>

      {/* ── Formato y calidad ────────────────────────────────── */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Formato</legend>
          <Controller
            control={control}
            name="formato"
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {OPCIONES_FORMATO.map((opcion) => {
                  const activo = field.value === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      onClick={() => field.onChange(opcion.valor)}
                      aria-pressed={activo}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all',
                        activo
                          ? 'border-primary/60 bg-primary/15'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]',
                      )}
                    >
                      {/* Miniatura con la proporción real: se entiende de un
                          vistazo, sin tener que leer "16:9". */}
                      <span
                        aria-hidden
                        style={{
                          width: opcion.vista.ancho,
                          height: opcion.vista.alto,
                        }}
                        className={cn(
                          'rounded-sm border',
                          activo ? 'border-primary bg-primary/30' : 'border-white/30',
                        )}
                      />
                      <span
                        className={cn(
                          'text-[11px]',
                          activo ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {opcion.descripcion}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Calidad</legend>
          <Controller
            control={control}
            name="calidad"
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {OPCIONES_CALIDAD.map((opcion) => {
                  const activo = field.value === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      onClick={() => field.onChange(opcion.valor)}
                      aria-pressed={activo}
                      className={cn(
                        'flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 transition-all',
                        activo
                          ? 'border-primary/60 bg-primary/15'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]',
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-medium',
                          activo ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {opcion.etiqueta}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70">
                        {opcion.descripcion}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </fieldset>
      </div>

      {/* ── Mejorar prompt ───────────────────────────────────── */}
      <Controller
        control={control}
        name="mejorarPrompt"
        render={({ field }) => (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <Checkbox
              id="mejorarPrompt"
              checked={field.value}
              onCheckedChange={(valor) => field.onChange(valor === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="mejorarPrompt" className="cursor-pointer text-sm font-medium">
                Mejorar prompt automáticamente
              </Label>
              <p className="text-xs text-muted-foreground">
                Una IA enriquece tu descripción con detalles de luz, composición y textura.
              </p>
            </div>
          </div>
        )}
      />

      {/* ── Generar ──────────────────────────────────────────── */}
      <Button
        type="submit"
        size="lg"
        disabled={generando}
        className="mt-5 h-14 w-full gap-2 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-base font-semibold shadow-lg shadow-violet-600/25 transition-all hover:brightness-110 hover:shadow-violet-600/40 disabled:opacity-60"
      >
        {generando ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Generando…
          </>
        ) : (
          <>
            <Sparkles className="size-5" />
            Generar imagen
          </>
        )}
      </Button>
    </form>
  );
}
