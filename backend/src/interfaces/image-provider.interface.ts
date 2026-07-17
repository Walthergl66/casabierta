/**
 * Contrato que todo proveedor de imágenes debe cumplir.
 *
 * El resto de la aplicación solo conoce esta interfaz, nunca una implementación
 * concreta. Cambiar de proveedor es cuestión de tocar `IMAGE_PROVIDER` en el
 * entorno; añadir uno nuevo consiste en implementar esto y registrarlo en
 * `ImageProviderFactory`, sin tocar servicios ni controladores.
 */

/** Token de inyección de Nest para el proveedor activo. */
export const IMAGE_PROVIDER = Symbol('IMAGE_PROVIDER');

export interface ImageGenerationRequest {
  /** Prompt final, ya mejorado y con el modificador de estilo aplicado. */
  readonly prompt: string;
  readonly width: number;
  readonly height: number;
  /** Semilla opcional; permite reproducir una generación concreta. */
  readonly seed?: number;
}

export interface ImageGenerationResult {
  /** Bytes de la imagen. El almacenamiento es responsabilidad de otra capa. */
  readonly bytes: Buffer;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  /** Respuesta cruda del proveedor, para depuración. Sin secretos. */
  readonly raw: Record<string, unknown>;
}

export interface ImageProvider {
  /** Identificador estable; se persiste en `prompts.proveedor`. */
  readonly nombre: string;

  /**
   * Genera una imagen.
   * @throws {ImageProviderError} si el proveedor falla o agota el tiempo.
   * @throws {ContentPolicyError} si el prompt infringe sus políticas.
   */
  generar(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
