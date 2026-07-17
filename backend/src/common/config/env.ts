import { z } from 'zod';

/**
 * Esquema de las variables de entorno del backend.
 *
 * Se valida al arrancar: si falta algo o está mal, el proceso muere de inmediato
 * con un mensaje claro, en vez de fallar a mitad de una petición del usuario.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
    DIRECT_URL: z.string().optional(),

    SUPABASE_URL: z.url('SUPABASE_URL debe ser una URL válida'),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(1, 'SUPABASE_SERVICE_ROLE_KEY es obligatoria'),
    SUPABASE_STORAGE_BUCKET: z.string().default('images'),

    REDIS_URL: z.string().min(1, 'REDIS_URL es obligatoria'),

    IMAGE_PROVIDER: z
      .enum(['pollinations', 'openai', 'google', 'flux', 'stability'])
      .default('pollinations'),

    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    FLUX_API_KEY: z.string().optional(),
    STABILITY_API_KEY: z.string().optional(),

    PROMPT_ENHANCER: z.enum(['none', 'openai', 'anthropic']).default('none'),
    ANTHROPIC_API_KEY: z.string().optional(),
  })
  // Cada proveedor de pago necesita su clave. Comprobarlo aquí evita descubrirlo
  // cuando un visitante ya está esperando su imagen.
  .superRefine((env, ctx) => {
    const clavePorProveedor: Record<string, keyof typeof env> = {
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      flux: 'FLUX_API_KEY',
      stability: 'STABILITY_API_KEY',
    };

    const requerida = clavePorProveedor[env.IMAGE_PROVIDER];
    if (requerida && !env[requerida]) {
      ctx.addIssue({
        code: 'custom',
        path: [requerida],
        message: `IMAGE_PROVIDER="${env.IMAGE_PROVIDER}" requiere que ${requerida} esté definida.`,
      });
    }

    if (env.PROMPT_ENHANCER === 'openai' && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENAI_API_KEY'],
        message: 'PROMPT_ENHANCER="openai" requiere OPENAI_API_KEY.',
      });
    }

    if (env.PROMPT_ENHANCER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ANTHROPIC_API_KEY'],
        message: 'PROMPT_ENHANCER="anthropic" requiere ANTHROPIC_API_KEY.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Valida `process.env` y aborta el arranque si la configuración es inválida. */
export function validateEnv(config: Record<string, unknown>): Env {
  const resultado = envSchema.safeParse(config);

  if (!resultado.success) {
    const detalles = resultado.error.issues
      .map((issue) => `  · ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Configuración de entorno inválida:\n${detalles}\n\n` +
        `Revisa tu fichero backend/.env (puedes partir de backend/.env.example).\n`,
    );
  }

  return resultado.data;
}
