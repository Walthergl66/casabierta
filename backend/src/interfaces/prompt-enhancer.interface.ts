/**
 * Contrato del mejorador de prompt.
 *
 * Convierte una idea escrita en lenguaje coloquial ("gato astronauta") en una
 * descripción rica que los modelos de difusión aprovechan mejor.
 */

export const PROMPT_ENHANCER = Symbol('PROMPT_ENHANCER');

export interface PromptEnhancer {
  readonly nombre: string;

  /**
   * Devuelve una versión mejorada del prompt.
   *
   * Nunca debe lanzar: si el LLM falla, la implementación devuelve el prompt
   * original. Mejorar es un extra, y no puede tumbar una generación.
   */
  mejorar(promptOriginal: string, estilo: string): Promise<string>;
}
