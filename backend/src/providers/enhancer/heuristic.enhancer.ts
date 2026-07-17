import { Injectable } from '@nestjs/common';
import { PromptEnhancer } from '../../interfaces/prompt-enhancer.interface';

/**
 * Mejorador por defecto: sin LLM, sin API key y sin coste.
 *
 * No entiende el prompt; se limita a añadir los descriptores de calidad que los
 * modelos de difusión aprovechan ("cinematic lighting", "8k", etc.), evitando
 * repetir los que el usuario ya escribió. El resultado no iguala al de un LLM,
 * pero mejora bastante la imagen y funciona sin configurar nada — que es justo
 * lo que se necesita el día de la Casa Abierta.
 *
 * Para resultados mejores, define PROMPT_ENHANCER=openai o =anthropic.
 */
@Injectable()
export class HeuristicEnhancer implements PromptEnhancer {
  readonly nombre = 'heuristic';

  /** Descriptores que empujan al modelo hacia una imagen cuidada. */
  private readonly descriptores = [
    'highly detailed',
    'masterpiece',
    'sharp focus',
    'cinematic lighting',
    'intricate details',
    'professional composition',
    '8k',
  ];

  mejorar(promptOriginal: string): Promise<string> {
    const normalizado = promptOriginal.trim().replace(/\s+/g, ' ');
    const enMinusculas = normalizado.toLowerCase();

    // Si el usuario ya pidió "8k" o "cinematic lighting", no lo repetimos:
    // duplicar términos diluye el peso de los demás en el condicionamiento.
    const aAnadir = this.descriptores.filter(
      (descriptor) => !enMinusculas.includes(descriptor.toLowerCase()),
    );

    const base = normalizado.replace(/[.,\s]+$/, '');
    const mejorado = aAnadir.length > 0 ? `${base}, ${aAnadir.join(', ')}` : base;

    return Promise.resolve(mejorado);
  }
}
