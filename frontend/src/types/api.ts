/**
 * Tipos del contrato con el backend.
 *
 * Reflejan los DTOs de NestJS. Al no ser un monorepo con paquete compartido,
 * se mantienen a mano: si cambias un DTO del backend, actualiza esto también.
 */

export const ESTILOS = [
  'realista',
  'anime',
  'pixar',
  'ghibli',
  'fantasy',
  'cyberpunk',
  'digital-art',
  '3d-render',
] as const;
export type Estilo = (typeof ESTILOS)[number];

export const FORMATOS = ['1:1', '16:9', '9:16'] as const;
export type Formato = (typeof FORMATOS)[number];

export const CALIDADES = ['normal', 'hd', 'ultra'] as const;
export type Calidad = (typeof CALIDADES)[number];

export interface GenerarImagenRequest {
  prompt: string;
  estilo: Estilo;
  formato: Formato;
  calidad: Calidad;
  mejorarPrompt: boolean;
  seed?: number;
}

export interface Generacion {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  promptOriginal: string;
  promptMejorado: string | null;
  estilo: Estilo;
  formato: Formato;
  calidad: Calidad;
  proveedor: string;
  /** Milisegundos que tardó la IA. */
  generationTime: number;
  createdAt: string;
}

export type EstadoTrabajo =
  | 'en-cola'
  | 'procesando'
  | 'completado'
  | 'fallido'
  | 'desconocido';

export interface EstadoGeneracion {
  jobId: string;
  estado: EstadoTrabajo;
  /** 0-100. */
  progreso: number;
  etapa: string;
  posicionEnCola?: number;
  resultado?: Generacion;
  error?: string;
}

export type OrdenGaleria = 'recientes' | 'populares' | 'aleatorias';

export interface ItemGaleria {
  id: string;
  generationId: string;
  imageUrl: string;
  width: number;
  height: number;
  prompt: string;
  estilo: Estilo;
  formato: Formato;
  calidad: Calidad;
  proveedor: string;
  likes: number;
  views: number;
  featured: boolean;
  createdAt: string;
}

export interface PaginaGaleria {
  items: ItemGaleria[];
  total: number;
  limite: number;
  offset: number;
  hayMas: boolean;
}

/** Forma de todos los errores que devuelve la API. */
export interface ErrorApi {
  code: string;
  message: string;
  issues?: { path: string; message: string }[];
}
