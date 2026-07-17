import type {
  EstadoGeneracion,
  ErrorApi,
  EstilizarFotoRequest,
  Generacion,
  GenerarImagenRequest,
  OrdenGaleria,
  PaginaGaleria,
  Salud,
} from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Error de API con el mensaje ya listo para mostrar.
 *
 * El backend siempre responde con `{ code, message }`, así que se conserva el
 * `code` para poder distinguir casos sin comparar cadenas de texto.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function peticion<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    // fetch solo rechaza por fallo de red, nunca por un código HTTP de error.
    throw new ApiError(
      'NETWORK_ERROR',
      'No pudimos conectar con el servidor. Revisa tu conexión.',
      0,
    );
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = cuerpo as ErrorApi | null;
    throw new ApiError(
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Algo salió mal. Inténtalo de nuevo.',
      respuesta.status,
    );
  }

  return cuerpo as T;
}

export const api = {
  /** Encola una generación. Devuelve el id del trabajo para hacer polling. */
  generar(request: GenerarImagenRequest): Promise<{ jobId: string }> {
    return peticion('/api/generations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /** Encola el estilizado de una foto de la cámara. */
  estilizarFoto(request: EstilizarFotoRequest): Promise<{ jobId: string }> {
    return peticion('/api/generations/photo', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  estadoGeneracion(jobId: string): Promise<EstadoGeneracion> {
    return peticion(`/api/generations/status/${jobId}`);
  },

  /** Estado del backend; dice si la cámara está disponible. */
  salud(): Promise<Salud> {
    return peticion('/api/health');
  },

  historial(limite = 12): Promise<Generacion[]> {
    return peticion(`/api/generations/history?limite=${limite}`);
  },

  inspiracion(): Promise<{ ideas: string[] }> {
    return peticion('/api/generations/inspiration');
  },

  galeria(orden: OrdenGaleria, limite = 24, offset = 0): Promise<PaginaGaleria> {
    return peticion(`/api/gallery?orden=${orden}&limite=${limite}&offset=${offset}`);
  },

  darLike(id: string): Promise<{ likes: number }> {
    return peticion(`/api/gallery/${id}/like`, { method: 'POST' });
  },

  registrarVista(id: string): Promise<void> {
    return peticion(`/api/gallery/${id}/view`, { method: 'POST' });
  },
};
