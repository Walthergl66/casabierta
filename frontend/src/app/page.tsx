'use client';

import { FormularioPrompt } from '@/components/formulario-prompt';
import { Historial } from '@/components/historial';
import { ResultadoGeneracion } from '@/components/resultado-generacion';
import { useGeneracion } from '@/hooks/use-generacion';
import { VALORES_INICIALES, type FormularioValores } from '@/lib/catalogo';
import { useState } from 'react';

export default function PaginaPrincipal() {
  const { generar, generando, progreso, etapa, resultado, error } = useGeneracion();

  // Se guardan los últimos valores enviados para que "Regenerar" repita
  // exactamente la misma petición, y para que el marco del resultado use el
  // formato correcto mientras aún no hay imagen.
  const [ultimosValores, setUltimosValores] =
    useState<FormularioValores>(VALORES_INICIALES);

  const enviar = (valores: FormularioValores) => {
    setUltimosValores(valores);
    generar(valores);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center sm:mb-12">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Convierte tus ideas en <span className="texto-degradado">imágenes</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          Describe lo que imaginas y una inteligencia artificial lo pintará por ti en
          segundos.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <FormularioPrompt onGenerar={enviar} generando={generando} />

        <ResultadoGeneracion
          generando={generando}
          progreso={progreso}
          etapa={etapa}
          resultado={resultado}
          error={error}
          formato={ultimosValores.formato}
          onRegenerar={() => generar(ultimosValores)}
        />
      </div>

      <Historial />
    </div>
  );
}
