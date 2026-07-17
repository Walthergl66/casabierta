import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuración de Prisma 7. Las URLs de conexión ya no viven en `schema.prisma`.
 *
 * Migrate usa `DIRECT_URL` (la conexión directa de Supabase, puerto 5432) y no
 * `DATABASE_URL`: esta última apunta al pooler (pgbouncer, 6543), que no soporta
 * las sentencias DDL que las migraciones necesitan.
 *
 * No se define `shadowDatabaseUrl` a propósito: Prisma crea y destruye una base
 * temporal por su cuenta, y apuntarla a la base principal aborta la migración.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
