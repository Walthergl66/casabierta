import { PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { ValidationError } from '../errors/domain.errors';

/**
 * Valida el cuerpo de la petición contra un esquema Zod.
 *
 * Sustituye a class-validator: el plan pide validación con Zod, y así el mismo
 * esquema puede compartirse conceptualmente con el frontend.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const resultado = this.schema.safeParse(value);

    if (!resultado.success) {
      const issues = resultado.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      throw new ValidationError('Los datos enviados no son válidos.', issues);
    }

    return resultado.data;
  }
}
