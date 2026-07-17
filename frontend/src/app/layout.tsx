import { Cabecera } from '@/components/cabecera';
import { FondoAnimado } from '@/components/fondo-animado';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DreamCanvas AI — Convierte tus ideas en imágenes',
  description:
    'Escribe una idea en lenguaje natural y una IA la convierte en una imagen de alta calidad en segundos. Club de Inteligencia Artificial.',
};

export const viewport: Viewport = {
  themeColor: '#120c1f',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `dark` fijo en el <html>: la app es dark-only, así que no hace falta
    // conmutador de tema ni script anti-parpadeo al hidratar.
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <FondoAnimado />
        <Providers>
          <Cabecera />
          <main className="flex-1">{children}</main>
          <Toaster position="bottom-center" />
        </Providers>
      </body>
    </html>
  );
}
