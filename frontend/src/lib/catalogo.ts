import type { Calidad, Estilo, Formato } from '@/types/api';
import { z } from 'zod';

/**
 * Catálogo de la UI: etiquetas, iconos y descripciones de cada opción.
 *
 * Los valores replican los del backend (`common/domain/catalogo.ts`). Si añades
 * un estilo allí, añádelo también aquí.
 */

export const OPCIONES_ESTILO: { valor: Estilo; etiqueta: string; emoji: string }[] = [
  { valor: 'realista', etiqueta: 'Realista', emoji: '📷' },
  { valor: 'anime', etiqueta: 'Anime', emoji: '🎌' },
  { valor: 'pixar', etiqueta: 'Pixar', emoji: '🧸' },
  { valor: 'ghibli', etiqueta: 'Ghibli', emoji: '🍃' },
  { valor: 'fantasy', etiqueta: 'Fantasy', emoji: '🐉' },
  { valor: 'cyberpunk', etiqueta: 'Cyberpunk', emoji: '🌃' },
  { valor: 'digital-art', etiqueta: 'Digital Art', emoji: '🎨' },
  { valor: '3d-render', etiqueta: '3D Render', emoji: '💎' },
];

export const OPCIONES_FORMATO: {
  valor: Formato;
  etiqueta: string;
  descripcion: string;
  /** Proporciones de la miniatura del selector, en píxeles. */
  vista: { ancho: number; alto: number };
}[] = [
  { valor: '1:1', etiqueta: 'Cuadrado', descripcion: '1:1', vista: { ancho: 20, alto: 20 } },
  { valor: '16:9', etiqueta: 'Horizontal', descripcion: '16:9', vista: { ancho: 26, alto: 15 } },
  { valor: '9:16', etiqueta: 'Vertical', descripcion: '9:16', vista: { ancho: 15, alto: 26 } },
];

export const OPCIONES_CALIDAD: {
  valor: Calidad;
  etiqueta: string;
  descripcion: string;
}[] = [
  { valor: 'normal', etiqueta: 'Normal', descripcion: 'Rápida' },
  { valor: 'hd', etiqueta: 'HD', descripcion: 'Equilibrada' },
  { valor: 'ultra', etiqueta: 'Ultra', descripcion: 'Máximo detalle' },
];

/** Etiqueta legible de un estilo; para la galería y el historial. */
export const ETIQUETA_ESTILO: Record<Estilo, string> = Object.fromEntries(
  OPCIONES_ESTILO.map((opcion) => [opcion.valor, opcion.etiqueta]),
) as Record<Estilo, string>;

/**
 * Esquema del formulario.
 *
 * Refleja las mismas reglas que valida el backend: así el usuario ve el error
 * al instante en vez de tras una ida y vuelta al servidor.
 */
export const formularioSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, 'Describe tu idea con al menos 3 caracteres.')
    .max(1000, 'El prompt no puede superar los 1000 caracteres.'),
  estilo: z.enum(['realista', 'anime', 'pixar', 'ghibli', 'fantasy', 'cyberpunk', 'digital-art', '3d-render']),
  formato: z.enum(['1:1', '16:9', '9:16']),
  calidad: z.enum(['normal', 'hd', 'ultra']),
  mejorarPrompt: z.boolean(),
});

export type FormularioValores = z.infer<typeof formularioSchema>;

export const VALORES_INICIALES: FormularioValores = {
  prompt: '',
  estilo: 'realista',
  formato: '1:1',
  calidad: 'hd',
  mejorarPrompt: true,
};

/** Proporción CSS de cada formato; para reservar espacio antes de tener la imagen. */
export const ASPECTO_CSS: Record<Formato, string> = {
  '1:1': '1 / 1',
  '16:9': '16 / 9',
  '9:16': '9 / 16',
};
