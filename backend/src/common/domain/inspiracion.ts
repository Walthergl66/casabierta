/**
 * Ideas para el botón "Inspirarme".
 *
 * Lista curada en vez de un LLM: es instantáneo, gratis y funciona sin API key.
 * Un visitante que no sabe qué escribir necesita una idea ya, no esperar dos
 * segundos a que un modelo se la invente.
 */
export const PROMPTS_DE_INSPIRACION: readonly string[] = [
  'Un dragón hecho de cristal sobre una ciudad futurista',
  'Una biblioteca infinita bajo el océano',
  'Un panda samurái luchando contra robots',
  'Una ciudad flotando entre nubes al atardecer',
  'Un zorro de origami corriendo por un bosque de neón',
  'Una ballena espacial nadando entre anillos de Saturno',
  'Un café acogedor dentro de un tronco de árbol gigante',
  'Un faro solitario en un mar de estrellas',
  'Un jardín botánico dentro de una estación espacial abandonada',
  'Un reloj de arena que contiene una tormenta en miniatura',
  'Un tren de vapor atravesando un desierto de dunas rosadas',
  'Una medusa bioluminiscente del tamaño de una catedral',
  'Un astronauta pescando en un lago sobre un asteroide',
  'Una ciudad construida sobre el caparazón de una tortuga milenaria',
  'Un músico tocando un piano hecho de hielo en la Antártida',
  'Un mercado nocturno flotante iluminado por farolillos',
  'Un robot jardinero cuidando la última flor de la Tierra',
  'Una montaña con la forma del rostro de un gigante dormido',
  'Un colibrí mecánico bebiendo de una flor de cristal',
  'Una escalera de caracol infinita entre las nubes',
  'Un gato astronauta comiendo pizza en Marte',
  'Una tormenta de mariposas sobre un campo de lavanda',
];

/**
 * Devuelve ideas aleatorias sin repetir.
 *
 * Baraja una copia con Fisher-Yates: `sort(() => Math.random() - 0.5)` es un
 * comparador inconsistente y produce un barajado sesgado.
 */
export function ideasAleatorias(cantidad: number): string[] {
  const copia = [...PROMPTS_DE_INSPIRACION];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia.slice(0, Math.min(cantidad, copia.length));
}
