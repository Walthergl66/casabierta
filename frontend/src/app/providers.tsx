'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Providers de cliente.
 *
 * El QueryClient se crea con `useState` y no como constante de módulo: en SSR
 * una constante de módulo se compartiría entre peticiones de usuarios distintos
 * y filtraría datos cacheados de uno a otro.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Durante la Casa Abierta la red del recinto puede ir justa;
            // reintentar una vez evita errores espurios.
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 15_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
