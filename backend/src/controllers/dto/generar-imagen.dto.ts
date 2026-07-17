import { z } from 'zod';
import { CALIDADES, ESTILOS, FORMATOS } from '../../common/domain/catalogo';

/**
 * Cuerpo de POST /api/generations.
 *
 * El límite de 1000 caracteres del prompt no es arbitrario: los modelos de
 * difusión ignoran casi todo lo que va más allá de unos cientos de tokens, así
 * que aceptar más solo invita a pegar textos enormes que no aportan nada.
 */
export const generarImagenSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, 'Describe tu idea con al menos 3 caracteres.')
    .max(1000, 'El prompt no puede superar los 1000 caracteres.'),

  estilo: z.enum(ESTILOS).default('realista'),
  formato: z.enum(FORMATOS).default('1:1'),
  calidad: z.enum(CALIDADES).default('hd'),

  /** Si es true, un LLM reescribe el prompt antes de generar. */
  mejorarPrompt: z.boolean().default(true),

  /** Semilla opcional; permite reproducir una generación concreta. */
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
});

export type GenerarImagenDto = z.infer<typeof generarImagenSchema>;
