import { PrismaPg } from '@prisma/adapter-pg';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../common/config/env';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Cliente Prisma gestionado por el ciclo de vida de Nest.
 *
 * En Prisma 7 el cliente exige un driver adapter: ya no acepta una URL suelta.
 * `DATABASE_URL` apunta al pooler de Supabase (pgbouncer, puerto 6543), que es
 * lo correcto en runtime; las migraciones usan `DIRECT_URL` a través de
 * `prisma.config.ts`, porque pgbouncer no soporta su DDL.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    PrismaService.logger.log('Conectado a PostgreSQL (Supabase).');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
