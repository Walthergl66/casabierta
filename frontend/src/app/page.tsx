'use client';

import { FormularioFoto } from '@/components/formulario-foto';
import { FormularioPrompt } from '@/components/formulario-prompt';
import { Historial } from '@/components/historial';
import { ResultadoGeneracion } from '@/components/resultado-generacion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGeneracion } from '@/hooks/use-generacion';
import { useSalud } from '@/hooks/use-salud';
import { VALORES_INICIALES, type FormularioValores } from '@/lib/catalogo';
import type { Estilo, Formato } from '@/types/api';
import { Camera, PenLine } from 'lucide-react';
import { useState } from 'react';

type Modo = 'texto' | 'foto';

export default function PaginaPrincipal() {
  const { generar, estilizarFoto, generando, progreso, etapa, resultado, error } =
    useGeneracion();

  const { data: salud } = useSalud();
  // Se oculta hasta confirmar que el backend la soporta: es preferible que la
  // pestaña aparezca un instante después a que alguien se haga una foto y
  // reciba un error.
  const camaraDisponible = salud?.camaraDisponible === true;

  const [modo, setModo] = useState<Modo>('texto');

  // Se guardan los últimos valores enviados para que "Regenerar" repita
  // exactamente la misma petición, y para que el marco del resultado use el
  // formato correcto mientras aún no hay imagen.
  const [ultimosValores, setUltimosValores] =
    useState<FormularioValores>(VALORES_INICIALES);
  const [ultimaFoto, setUltimaFoto] = useState<{
    foto: string;
    estilo: Estilo;
    nota: string;
  } | null>(null);

  const enviarTexto = (valores: FormularioValores) => {
    setUltimosValores(valores);
    setUltimaFoto(null);
    generar(valores);
  };

  const enviarFoto = (foto: string, estilo: Estilo, nota: string) => {
    setUltimaFoto({ foto, estilo, nota });
    estilizarFoto({ foto, estilo, nota: nota || undefined });
  };

  const regenerar = () => {
    if (ultimaFoto !== null) {
      estilizarFoto({
        foto: ultimaFoto.foto,
        estilo: ultimaFoto.estilo,
        nota: ultimaFoto.nota || undefined,
      });
      return;
    }
    generar(ultimosValores);
  };

  // Un retrato sale vertical; el marco debe reservar esa forma desde el principio.
  const formatoDelMarco: Formato = ultimaFoto !== null ? '9:16' : ultimosValores.formato;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center sm:mb-12">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Convierte tus ideas en <span className="texto-degradado">imágenes</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          {camaraDisponible
            ? 'Describe lo que imaginas — o hazte una foto y conviértete en otra cosa.'
            : 'Describe lo que imaginas y una inteligencia artificial lo pintará por ti en segundos.'}
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div>
          {camaraDisponible ? (
            <Tabs value={modo} onValueChange={(valor) => setModo(valor as Modo)}>
              <TabsList className="mb-3 grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="texto" className="gap-1.5">
                  <PenLine className="size-4" />
                  Describir
                </TabsTrigger>
                <TabsTrigger value="foto" className="gap-1.5">
                  <Camera className="size-4" />
                  Hazte una foto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="texto">
                <FormularioPrompt onGenerar={enviarTexto} generando={generando} />
              </TabsContent>

              <TabsContent value="foto">
                <FormularioFoto onEstilizar={enviarFoto} generando={generando} />
              </TabsContent>
            </Tabs>
          ) : (
            <FormularioPrompt onGenerar={enviarTexto} generando={generando} />
          )}
        </div>

        <ResultadoGeneracion
          generando={generando}
          progreso={progreso}
          etapa={etapa}
          resultado={resultado}
          error={error}
          formato={formatoDelMarco}
          onRegenerar={regenerar}
        />
      </div>

      <Historial />
    </div>
  );
}
