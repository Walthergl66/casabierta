import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { Env } from '../common/config/env';
import { StorageError } from '../common/errors/domain.errors';

export interface ImagenSubida {
  /** URL pública, lista para <img src>. */
  readonly publicUrl: string;
  /** Ruta interna dentro del bucket; necesaria para borrar o firmar. */
  readonly path: string;
  readonly fileSize: number;
  readonly mimeType: string;
}

/**
 * Subida de imágenes a Supabase Storage.
 *
 * Usa la service role key, que salta las políticas RLS. Esa clave solo vive en
 * el backend: si llegara al navegador, cualquiera podría escribir en el bucket.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.supabase = createClient(
      config.get('SUPABASE_URL', { infer: true }),
      config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
      // El backend no tiene sesión de usuario que persistir ni refrescar.
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    this.bucket = config.get('SUPABASE_STORAGE_BUCKET', { infer: true });
  }

  /**
   * Avisa al arrancar si el bucket no existe, en vez de dejar que falle la
   * primera generación con un visitante delante.
   */
  async onModuleInit(): Promise<void> {
    const { data, error } = await this.supabase.storage.getBucket(this.bucket);

    if (error || !data) {
      this.logger.warn(
        `No se pudo verificar el bucket "${this.bucket}": ${error?.message ?? 'no encontrado'}. ` +
          `Créalo (público) en el panel de Supabase antes de generar imágenes.`,
      );
      return;
    }

    if (!data.public) {
      this.logger.warn(
        `El bucket "${this.bucket}" es privado; las URLs públicas no funcionarán. ` +
          `Márcalo como público en el panel de Supabase.`,
      );
    }
  }

  /** Sube los bytes y devuelve la URL pública. */
  async subirImagen(bytes: Buffer, mimeType: string): Promise<ImagenSubida> {
    const path = this.construirPath(mimeType);

    const { error } = await this.supabase.storage.from(this.bucket).upload(path, bytes, {
      contentType: mimeType,
      // Los paths son únicos por UUID; sobrescribir nunca es lo correcto aquí.
      upsert: false,
      cacheControl: '31536000',
    });

    if (error) {
      throw new StorageError(
        'No se pudo guardar la imagen en el almacenamiento.',
        error,
      );
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);

    return {
      publicUrl: data.publicUrl,
      path,
      fileSize: bytes.byteLength,
      mimeType,
    };
  }

  /** Borra una imagen. Usado para no dejar huérfanos si falla el guardado en BD. */
  async borrarImagen(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove([path]);

    if (error) {
      // Un huérfano en Storage no justifica romper la petición del usuario:
      // se registra y se sigue.
      this.logger.warn({ err: error, path }, 'No se pudo borrar la imagen huérfana.');
    }
  }

  /**
   * Construye un path particionado por fecha (`2026/07/16/<uuid>.png`).
   *
   * Agrupar por día mantiene manejable el listado del bucket y permite purgar
   * un evento concreto borrando un prefijo.
   */
  private construirPath(mimeType: string): string {
    const ahora = new Date();
    const anio = ahora.getUTCFullYear();
    const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getUTCDate()).padStart(2, '0');
    const extension = this.extensionDe(mimeType);

    return `${anio}/${mes}/${dia}/${randomUUID()}.${extension}`;
  }

  private extensionDe(mimeType: string): string {
    const extensiones: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    return extensiones[mimeType] ?? 'png';
  }
}
