'use client';

import { cn } from '@/lib/utils';
import { Images, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ENLACES = [
  { href: '/', etiqueta: 'Crear', icono: Sparkles },
  { href: '/galeria', etiqueta: 'Galería', icono: Images },
] as const;

/** Cabecera fija con la navegación principal. */
export function Cabecera() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg shadow-fuchsia-500/25 transition-transform group-hover:scale-105">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            DreamCanvas <span className="texto-degradado">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {ENLACES.map(({ href, etiqueta, icono: Icono }) => {
            const activo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activo
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                )}
              >
                <Icono className="size-4" />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
