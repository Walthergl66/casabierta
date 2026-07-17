import { z } from 'zod';
import { ESTILOS } from '../../common/domain/catalogo';

/** Tamaño máximo de la foto ya decodificada. */
export const MAX_BYTES_FOTO = 6 * 1024 * 1024;

/** Formatos que aceptamos de la cámara. */
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Cuerpo de POST /api/generations/photo.
 *
 * La foto llega como data URL porque es lo que produce `canvas.toDataURL()` en
 * el navegador. Se valida aquí y se convierte a Buffer una sola vez.
 */
export const estilizarFotoSchema = z.object({
  /** Data URL: `data:image/jpeg;base64,...` */
  foto: z
    .string()
    .min(1, 'Falta la foto.')
    .refine(
      (valor) => /^data:image\/(jpeg|png|webp);base64,/.test(valor),
      'La foto debe ser una data URL JPEG, PNG o WebP.',
    ),

  estilo: z.enum(ESTILOS),

  /** Nota opcional del usuario: "conviérteme en pirata". */
  nota: z
    .string()
    .trim()
    .max(300, 'La nota no puede superar los 300 caracteres.')
    .optional(),
});

export type EstilizarFotoDto = z.infer<typeof estilizarFotoSchema>;

export interface FotoDecodificada {
  readonly bytes: Buffer;
  readonly mimeType: string;
}

/**
 * Convierte la data URL en bytes, comprobando tipo y tamaño.
 *
 * El límite se aplica sobre los bytes ya decodificados, no sobre la cadena:
 * base64 abulta ~33 % más, así que medir la cadena rechazaría fotos válidas.
 */
export function decodificarFoto(dataUrl: string): FotoDecodificada | { error: string } {
  const coincidencia = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);

  if (!coincidencia) {
    return { error: 'La foto no tiene un formato válido.' };
  }

  const [, mimeType, base64] = coincidencia;

  if (!MIMES_PERMITIDOS.includes(mimeType as (typeof MIMES_PERMITIDOS)[number])) {
    return { error: `Formato no admitido: ${mimeType}.` };
  }

  const bytes = Buffer.from(base64, 'base64');

  if (bytes.byteLength === 0) {
    return { error: 'La foto está vacía.' };
  }

  if (bytes.byteLength > MAX_BYTES_FOTO) {
    const mb = (bytes.byteLength / 1024 / 1024).toFixed(1);
    return { error: `La foto pesa ${mb} MB; el máximo son 6 MB.` };
  }

  return { bytes, mimeType };
}
