import { BullModule } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { Env, validateEnv } from './common/config/env';
import { HealthController } from './controllers/health.controller';
import { GalleryModule } from './modules/gallery/gallery.module';
import { GenerationModule } from './modules/generation/generation.module';
import { PersistenceModule } from './modules/persistence.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Valida con Zod al arrancar: si el entorno está mal, el proceso muere
      // aquí con un mensaje claro y no a mitad de una petición.
      validate: validateEnv,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // Coloreado y legible en desarrollo; JSON en producción, que es lo
          // que esperan los agregadores de logs de Railway.
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          // Las cabeceras pueden llevar cookies o tokens: nunca al log.
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const logger = new Logger('Redis');
        const url = new URL(config.get('REDIS_URL', { infer: true }));
        const esLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            username: url.username || undefined,
            password: url.password || undefined,
            // Upstash y la mayoría de Redis gestionados exigen TLS (rediss://).
            tls: url.protocol === 'rediss:' ? {} : undefined,
            // BullMQ lo requiere: sin esto, los workers fallan al arrancar.
            maxRetriesPerRequest: null,

            /**
             * Sin `retryStrategy`, ioredis reintenta cada 50 ms y escupe una
             * traza por intento: si Redis no está, el log se vuelve ilegible en
             * segundos y en ninguna línea pone qué hacer. Aquí se dice una vez,
             * en cristiano, y luego se espacian los reintentos.
             */
            retryStrategy: (intentos: number) => {
              if (intentos === 1) {
                logger.error(
                  `No se pudo conectar a Redis en ${url.hostname}:${url.port || 6379}.` +
                    (esLocal
                      ? ' Arráncalo con «npm run redis:up» (o usa «npm run dev», que lo levanta solo).'
                      : ' Revisa REDIS_URL en tu .env.'),
                );
              } else if (intentos % 20 === 0) {
                logger.warn(`Redis sigue sin responder (intento ${intentos}).`);
              }

              // Espera creciente hasta 5 s: reintenta, pero sin inundar el log.
              return Math.min(intentos * 200, 5_000);
            },
          },
        };
      },
    }),

    PersistenceModule,
    GenerationModule,
    GalleryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
