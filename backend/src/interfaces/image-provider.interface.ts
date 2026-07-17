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

// ─────────────────────────────────────────────────────────────
// Edición de imagen (imagen a imagen)
// ─────────────────────────────────────────────────────────────

/** Token de inyección del proveedor de edición. Puede ser null si está apagada. */
export const IMAGE_EDIT_PROVIDER = Symbol('IMAGE_EDIT_PROVIDER');

export interface ImageEditRequest {
  /** Instrucción de estilo. Describe la transformación, no la escena. */
  readonly prompt: string;
  /** Bytes de la foto original. Nunca se persisten: solo viajan al proveedor. */
  readonly imagen: Buffer;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Contrato para estilizar una foto existente.
 *
 * Va aparte de `ImageProvider` porque son capacidades distintas: Pollinations
 * genera imágenes pero **no** sabe editarlas (comprobado — ignora la imagen de
 * entrada y devuelve algo sin relación). Separarlos evita que el resto del
 * código asuma que todo proveedor puede hacer las dos cosas.
 */
export interface ImageEditProvider {
  readonly nombre: string;

  /**
   * Reinterpreta una foto con el estilo pedido.
   * @throws {ImageProviderError} si el proveedor falla o agota el tiempo.
   * @throws {ContentPolicyError} si la foto o el prompt infringen sus políticas.
   */
  editar(request: ImageEditRequest): Promise<ImageGenerationResult>;
}
