/**
 * Formatea una fecha ISO como tiempo relativo ("hace 3 min").
 *
 * Usa `Intl.RelativeTimeFormat`, que ya trae el navegador: no merece la pena
 * añadir date-fns ni dayjs solo para esto.
 */
const formateador = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const UNIDADES: { limiteSegundos: number; segundosPorUnidad: number; unidad: Intl.RelativeTimeFormatUnit }[] = [
  { limiteSegundos: 60, segundosPorUnidad: 1, unidad: 'second' },
  { limiteSegundos: 3600, segundosPorUnidad: 60, unidad: 'minute' },
  { limiteSegundos: 86_400, segundosPorUnidad: 3600, unidad: 'hour' },
  { limiteSegundos: 604_800, segundosPorUnidad: 86_400, unidad: 'day' },
  { limiteSegundos: 2_629_800, segundosPorUnidad: 604_800, unidad: 'week' },
  { limiteSegundos: 31_557_600, segundosPorUnidad: 2_629_800, unidad: 'month' },
  { limiteSegundos: Infinity, segundosPorUnidad: 31_557_600, unidad: 'year' },
];

export function tiempoRelativo(fechaIso: string): string {
  const transcurridos = (Date.now() - new Date(fechaIso).getTime()) / 1000;

  // Un reloj de cliente ligeramente adelantado daría segundos negativos y un
  // absurdo "dentro de 4 segundos"; se corta en cero.
  const segundos = Math.max(0, transcurridos);

  if (segundos < 10) return 'ahora mismo';

  const escala = UNIDADES.find(({ limiteSegundos }) => segundos < limiteSegundos);
  if (escala === undefined) return 'hace mucho';

  const cantidad = Math.floor(segundos / escala.segundosPorUnidad);
  return formateador.format(-cantidad, escala.unidad);
}
