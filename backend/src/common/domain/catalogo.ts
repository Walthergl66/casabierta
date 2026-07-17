import { Calidad, Estilo, Formato } from '../../generated/prisma/enums';

/**
 * Catálogo de opciones que el usuario puede elegir.
 *
 * Es la única fuente de verdad: los valores de la API, los enums de Prisma y los
 * modificadores que se inyectan al prompt salen todos de aquí. Añadir un estilo
 * nuevo se hace en un único sitio.
 */

/** Valores tal y como viajan por la API (minúsculas, estables para el frontend). */
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
export type EstiloApi = (typeof ESTILOS)[number];

export const FORMATOS = ['1:1', '16:9', '9:16'] as const;
export type FormatoApi = (typeof FORMATOS)[number];

export const CALIDADES = ['normal', 'hd', 'ultra'] as const;
export type CalidadApi = (typeof CALIDADES)[number];

/** Traducción API → enum de Prisma. */
export const ESTILO_A_PRISMA: Record<EstiloApi, Estilo> = {
  realista: 'REALISTA',
  anime: 'ANIME',
  pixar: 'PIXAR',
  ghibli: 'GHIBLI',
  fantasy: 'FANTASY',
  cyberpunk: 'CYBERPUNK',
  'digital-art': 'DIGITAL_ART',
  '3d-render': 'RENDER_3D',
};

export const FORMATO_A_PRISMA: Record<FormatoApi, Formato> = {
  '1:1': 'CUADRADO',
  '16:9': 'HORIZONTAL',
  '9:16': 'VERTICAL',
};

export const CALIDAD_A_PRISMA: Record<CalidadApi, Calidad> = {
  normal: 'NORMAL',
  hd: 'HD',
  ultra: 'ULTRA',
};

/** Traducción inversa, para devolver al frontend lo que hay en base de datos. */
export const PRISMA_A_ESTILO: Record<Estilo, EstiloApi> = Object.fromEntries(
  Object.entries(ESTILO_A_PRISMA).map(([api, prisma]) => [prisma, api]),
) as Record<Estilo, EstiloApi>;

export const PRISMA_A_FORMATO: Record<Formato, FormatoApi> = Object.fromEntries(
  Object.entries(FORMATO_A_PRISMA).map(([api, prisma]) => [prisma, api]),
) as Record<Formato, FormatoApi>;

export const PRISMA_A_CALIDAD: Record<Calidad, CalidadApi> = Object.fromEntries(
  Object.entries(CALIDAD_A_PRISMA).map(([api, prisma]) => [prisma, api]),
) as Record<Calidad, CalidadApi>;

/** Fragmento que se añade al prompt para conseguir cada estética. */
export const MODIFICADOR_DE_ESTILO: Record<EstiloApi, string> = {
  realista:
    'photorealistic, shot on a 50mm lens, natural lighting, sharp focus, lifelike textures',
  anime:
    'anime style, cel shaded, vibrant colors, clean line art, expressive eyes, studio anime key visual',
  pixar:
    'Pixar style 3D animation, soft global illumination, rounded appealing character design, subsurface scattering',
  ghibli:
    'Studio Ghibli style, hand painted watercolor backgrounds, warm nostalgic palette, whimsical atmosphere',
  fantasy:
    'epic fantasy art, dramatic volumetric lighting, intricate detail, matte painting, mythical atmosphere',
  cyberpunk:
    'cyberpunk aesthetic, neon rim lighting, rain slicked streets, holographic signage, moody teal and magenta palette',
  'digital-art':
    'digital painting, bold brushwork, striking composition, trending on artstation',
  '3d-render':
    'high end 3D render, octane render, physically based materials, studio lighting, ray traced reflections',
};

/**
 * Resolución por formato y calidad.
 *
 * Los lados se mantienen múltiplos de 64: es lo que esperan los modelos de difusión
 * y evita que el proveedor redondee por su cuenta y descuadre la relación de aspecto.
 */
export const RESOLUCIONES: Record<
  FormatoApi,
  Record<CalidadApi, { width: number; height: number }>
> = {
  '1:1': {
    normal: { width: 768, height: 768 },
    hd: { width: 1024, height: 1024 },
    ultra: { width: 1536, height: 1536 },
  },
  '16:9': {
    normal: { width: 1024, height: 576 },
    hd: { width: 1344, height: 768 },
    ultra: { width: 1920, height: 1088 },
  },
  '9:16': {
    normal: { width: 576, height: 1024 },
    hd: { width: 768, height: 1344 },
    ultra: { width: 1088, height: 1920 },
  },
};

/**
 * Instrucción para estilizar una FOTO con cada estilo.
 *
 * No se reutiliza `MODIFICADOR_DE_ESTILO` porque el problema es otro: aquel
 * describe una escena que el modelo debe inventar; aquí hay que ordenar una
 * transformación sobre una foto que ya existe. Todas insisten en conservar la
 * identidad, la pose y la composición — si el visitante no se reconoce, la demo
 * no tiene ninguna gracia.
 */
export const INSTRUCCION_DE_ESTILO_FOTO: Record<EstiloApi, string> = {
  realista:
    'Restyle this photo as a professional studio portrait: dramatic cinematic lighting, shallow depth of field, crisp detail, polished color grading.',
  anime:
    'Redraw this photo in Japanese anime style: cel shading, bold clean line art, large expressive eyes, vibrant saturated colors, anime key visual look.',
  pixar:
    'Redraw this photo as a Pixar-style 3D animated character: soft global illumination, rounded appealing features, subsurface scattering on the skin, warm cinematic lighting.',
  ghibli:
    'Redraw this photo in Studio Ghibli style: hand-painted watercolor look, soft warm nostalgic palette, gentle linework, whimsical storybook atmosphere.',
  fantasy:
    'Reimagine this photo as epic fantasy art: the subject as a heroic fantasy character with ornate armor or robes, dramatic volumetric lighting, painterly matte-painting detail.',
  cyberpunk:
    'Reimagine this photo in cyberpunk style: neon rim lighting in teal and magenta, holographic reflections, futuristic clothing and subtle tech augmentations, moody rain-slicked night atmosphere.',
  'digital-art':
    'Redraw this photo as a stylized digital painting: bold visible brushwork, striking color palette, artstation-quality rendering.',
  '3d-render':
    'Redraw this photo as a high-end 3D character render: octane render quality, physically based materials, studio lighting, ray-traced reflections.',
};

/**
 * Se antepone a la instrucción de estilo en toda edición de foto.
 *
 * Va delante porque en los modelos de difusión los primeros tokens pesan más:
 * preservar a la persona debe mandar sobre cualquier detalle estético.
 */
export const PRESERVAR_IDENTIDAD =
  'Keep the same person, their facial identity, pose, expression and overall composition clearly recognizable.';

/** Etiquetas legibles, para logs y para la UI. */
export const ETIQUETA_DE_ESTILO: Record<EstiloApi, string> = {
  realista: 'Realista',
  anime: 'Anime',
  pixar: 'Pixar',
  ghibli: 'Ghibli',
  fantasy: 'Fantasy',
  cyberpunk: 'Cyberpunk',
  'digital-art': 'Digital Art',
  '3d-render': '3D Render',
};
