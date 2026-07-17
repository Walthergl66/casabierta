/**
 * Errores de dominio.
 *
 * Los proveedores externos devuelven fallos en formatos dispares y a veces con
 * información sensible (claves en URLs, trazas internas). Todo eso se traduce a
 * estas clases antes de salir del backend, de modo que el usuario reciba un
 * mensaje entendible y los detalles crudos queden solo en los logs.
 */

export abstract class DomainError extends Error {
  /** Código HTTP con el que se responde al cliente. */
  abstract readonly statusCode: number;
  /** Identificador estable para que el frontend distinga casos sin parsear texto. */
  abstract readonly code: string;

  constructor(
    message: string,
    /** Error original. Se registra, pero nunca se envía al cliente. */
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** El proveedor de imágenes falló, tardó demasiado o devolvió algo inesperado. */
export class ImageProviderError extends DomainError {
  readonly statusCode = 502;
  readonly code = 'IMAGE_PROVIDER_ERROR';

  constructor(
    readonly provider: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/** No se pudo guardar o leer la imagen en Supabase Storage. */
export class StorageError extends DomainError {
  readonly statusCode = 502;
  readonly code = 'STORAGE_ERROR';
}

/** Se pidió un recurso que no existe. */
export class NotFoundError extends DomainError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(recurso: string, id: string) {
    super(`No se encontró ${recurso} con id "${id}".`);
  }
}

/** La petición del usuario no es válida. */
export class ValidationError extends DomainError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    readonly issues: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** El prompt fue rechazado por las políticas de contenido del proveedor. */
export class ContentPolicyError extends DomainError {
  readonly statusCode = 422;
  readonly code = 'CONTENT_POLICY';

  constructor(message = 'El prompt fue rechazado por las políticas de contenido.') {
    super(message);
  }
}
