import { ImageProviderError } from '../../common/errors/domain.errors';

/**
 * Utilidades HTTP compartidas por los proveedores de imagen.
 *
 * Generar una imagen puede tardar decenas de segundos, así que `fetch` a pelo no
 * basta: sin timeout una petición colgada retiene un worker indefinidamente, y
 * durante un evento con cola eso se nota enseguida.
 */

export interface FetchConTimeoutOpts extends RequestInit {
  /** Milisegundos antes de abortar. */
  timeoutMs: number;
  /** Nombre del proveedor, para el mensaje de error. */
  proveedor: string;
}

export async function fetchConTimeout(
  url: string,
  { timeoutMs, proveedor, ...init }: FetchConTimeoutOpts,
): Promise<Response> {
  const controller = new AbortController();
  const temporizador = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ImageProviderError(
        proveedor,
        `El proveedor no respondió en ${Math.round(timeoutMs / 1000)}s.`,
        error,
      );
    }
    throw new ImageProviderError(
      proveedor,
      'No se pudo contactar con el proveedor de imágenes.',
      error,
    );
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Reintenta una operación con espera exponencial.
 *
 * Solo tiene sentido para fallos transitorios (5xx, rate limit, red). Un 400 o un
 * rechazo por políticas de contenido volverá a fallar igual, así que quien llama
 * decide con `esReintentable`.
 */
export async function conReintentos<T>(
  operacion: () => Promise<T>,
  opts: {
    intentos: number;
    esperaBaseMs: number;
    esReintentable: (error: unknown) => boolean;
    alReintentar?: (intento: number, error: unknown) => void;
  },
): Promise<T> {
  let ultimoError: unknown;

  for (let intento = 1; intento <= opts.intentos; intento++) {
    try {
      return await operacion();
    } catch (error) {
      ultimoError = error;

      if (intento === opts.intentos || !opts.esReintentable(error)) {
        throw error;
      }

      opts.alReintentar?.(intento, error);
      // Espera exponencial con jitter, para no sincronizar reintentos de
      // varios trabajos que hayan fallado a la vez.
      const espera = opts.esperaBaseMs * 2 ** (intento - 1);
      const jitter = Math.random() * opts.esperaBaseMs;
      await new Promise((resolve) => setTimeout(resolve, espera + jitter));
    }
  }

  throw ultimoError;
}

/** Un 5xx o un 429 suelen resolverse solos; el resto, no. */
export function esErrorTransitorio(error: unknown): boolean {
  if (error instanceof ImageProviderError) {
    // Los timeouts y fallos de red se envuelven en ImageProviderError.
    return true;
  }
  return false;
}

/** Comprueba que la respuesta sea realmente una imagen y la devuelve como Buffer. */
export async function leerImagen(
  respuesta: Response,
  proveedor: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const mimeType = respuesta.headers.get('content-type') ?? '';

  if (!mimeType.startsWith('image/')) {
    const cuerpo = await respuesta.text().catch(() => '');
    throw new ImageProviderError(
      proveedor,
      `Se esperaba una imagen y se recibió "${mimeType || 'desconocido'}".`,
      cuerpo.slice(0, 500),
    );
  }

  const bytes = Buffer.from(await respuesta.arrayBuffer());

  if (bytes.byteLength === 0) {
    throw new ImageProviderError(proveedor, 'El proveedor devolvió una imagen vacía.');
  }

  return { bytes, mimeType };
}
