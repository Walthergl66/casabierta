import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { Env } from './common/config/env';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Comprueba que Redis responde ANTES de levantar Nest.
 *
 * Sin esto, BullMQ arranca igual y se queda reintentando en bucle: escupe cientos
 * de trazas `ECONNREFUSED` por minuto y el servidor queda medio vivo — responde a
 * la galería pero no puede generar nada. Es mejor morir aquí con una frase que
 * diga qué hacer, igual que hace la validación de entorno.
 *
 * Un corte de Redis con la app ya en marcha sí se reintenta: de eso se encarga
 * el `retryStrategy` de `app.module.ts`.
 */
async function comprobarRedis(): Promise<void> {
  const urlCruda = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const url = new URL(urlCruda);
  const esLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

  const redis = new Redis(urlCruda, {
    lazyConnect: true,
    // Un solo intento: aquí solo queremos saber si está o no.
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
  });

  // ioredis lanza si nadie escucha 'error'; el fallo se maneja en el catch.
  redis.on('error', () => {});

  try {
    await redis.connect();
    await redis.ping();
  } catch {
    console.error(
      `\n❌ No se pudo conectar a Redis en ${url.hostname}:${url.port || 6379}.\n\n` +
        (esLocal
          ? '   Arráncalo con:  npm run redis:up\n' +
            '   O usa:          npm run dev   (levanta Redis, backend y frontend)\n'
          : '   Revisa REDIS_URL en tu .env.\n'),
    );
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

async function bootstrap(): Promise<void> {
  await comprobarRedis();

  const app = await NestFactory.create(AppModule, {
    // Silencia el logger por defecto: nestjs-pino lo sustituye justo debajo.
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(
    helmet({
      // Las imágenes se sirven desde el dominio de Supabase, no desde aquí.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Las fotos de la cámara llegan como data URL en el cuerpo JSON. El límite
  // por defecto de Express son 100 KB: sin esto, cualquier foto se rechaza con
  // un 413 antes siquiera de llegar al controlador. 8 MB deja margen sobre el
  // tope de 6 MB que valida el DTO, contando el ~33 % que abulta el base64.
  app.use(express.json({ limit: '8mb' }));

  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origen) => origen.trim()),
    methods: ['GET', 'POST'],
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  // Cierra conexiones de Prisma, Redis y la cola cuando Railway envía SIGTERM.
  app.enableShutdownHooks();

  const puerto = config.get('PORT', { infer: true });
  await app.listen(puerto, '0.0.0.0');

  app.get(Logger).log(`DreamCanvas AI escuchando en el puerto ${puerto}`);
}

void bootstrap();
