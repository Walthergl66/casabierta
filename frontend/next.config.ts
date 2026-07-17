import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // `images.domains` está deprecado en Next 16; `remotePatterns` es el
    // sustituto y permite acotar también protocolo y ruta.
    remotePatterns: [
      {
        protocol: 'https',
        // Comodín para no tener que fijar aquí la referencia del proyecto:
        // el hostname de Supabase cambia según la cuenta.
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Solo se usa si IMAGE_PROVIDER=pollinations y se decide enlazar sus
        // URLs directamente, sin pasar por Storage.
        protocol: 'https',
        hostname: 'image.pollinations.ai',
      },
    ],
  },
};

export default nextConfig;
