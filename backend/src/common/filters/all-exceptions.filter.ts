import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  ValidationError,
} from '../errors/domain.errors';

/** Forma única de todas las respuestas de error de la API. */
interface RespuestaError {
  readonly code: string;
  readonly message: string;
  readonly issues?: readonly { path: string; message: string }[];
}

/**
 * Traduce cualquier excepción a una respuesta JSON coherente.
 *
 * Regla que justifica este filtro: el cliente nunca ve una traza ni el error
 * crudo de un proveedor externo, que puede contener claves o rutas internas.
 * Todo eso se queda en los logs.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const { statusCode, cuerpo } = this.traducir(exception);

    if (statusCode >= 500) {
      this.logger.error({ err: exception }, 'Error no controlado.');
    }

    response.status(statusCode).json(cuerpo);
  }

  private traducir(exception: unknown): {
    statusCode: number;
    cuerpo: RespuestaError;
  } {
    if (exception instanceof ValidationError) {
      return {
        statusCode: exception.statusCode,
        cuerpo: {
          code: exception.code,
          message: exception.message,
          issues: exception.issues,
        },
      };
    }

    if (exception instanceof DomainError) {
      // El `cause` lleva el error original del proveedor: se registra, nunca se envía.
      if (exception.cause) {
        this.logger.warn({ err: exception.cause }, exception.message);
      }

      return {
        statusCode: exception.statusCode,
        cuerpo: { code: exception.code, message: exception.message },
      };
    }

    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        cuerpo: { code: 'HTTP_ERROR', message: exception.message },
      };
    }

    return {
      statusCode: 500,
      cuerpo: {
        code: 'INTERNAL_ERROR',
        message: 'Algo salió mal por nuestra parte. Inténtalo de nuevo.',
      },
    };
  }
}
