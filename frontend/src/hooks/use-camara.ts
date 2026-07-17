'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Lado más largo de la foto que se envía al backend. */
const LADO_MAXIMO = 1024;

/** Calidad del JPEG resultante. 0.85 es casi indistinguible y pesa la mitad. */
const CALIDAD_JPEG = 0.85;

export type EstadoCamara = 'inactiva' | 'pidiendo-permiso' | 'lista' | 'error';

interface Camara {
  estado: EstadoCamara;
  error: string | null;
  /** Se enlaza al <video> del componente. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  abrir: () => Promise<void>;
  cerrar: () => void;
  /** Captura un fotograma y lo devuelve como data URL JPEG ya reducida. */
  capturar: () => string | null;
  /** True si hay más de una cámara (móviles: frontal y trasera). */
  puedeCambiar: boolean;
  cambiarCamara: () => Promise<void>;
}

/**
 * Acceso a la cámara del dispositivo.
 *
 * Dos cosas que no son evidentes y que rompen esto si se ignoran:
 *
 * 1. `getUserMedia` solo existe en **contexto seguro**: HTTPS o localhost. En
 *    la Casa Abierta, si sirves el frontend por IP local (http://192.168.x.x),
 *    el navegador no da cámara ni pide permiso — falla directamente.
 * 2. Hay que **parar los tracks a mano**. Si no, el piloto de la cámara sigue
 *    encendido después de cerrar, que es lo que asusta a la gente.
 */
export function useCamara(): Camara {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [estado, setEstado] = useState<EstadoCamara>('inactiva');
  const [error, setError] = useState<string | null>(null);
  const [puedeCambiar, setPuedeCambiar] = useState(false);
  const [frontal, setFrontal] = useState(true);

  const detenerStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const iniciar = useCallback(
    async (usarFrontal: boolean) => {
      setEstado('pidiendo-permiso');
      setError(null);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setEstado('error');
        setError(
          window.isSecureContext === false
            ? 'La cámara necesita una conexión segura (HTTPS). Ábrelo en localhost o pon un certificado.'
            : 'Este navegador no permite acceder a la cámara.',
        );
        return;
      }

      try {
        detenerStream();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            // "ideal" y no "exact": en un portátil sin cámara frontal, exact
            // fallaría en vez de coger la que haya.
            facingMode: usarFrontal ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            // Algunos navegadores rechazan play() sin gesto del usuario; el
            // <video> lleva autoPlay y arranca igual.
          });
        }

        // Solo se puede enumerar tras conceder permiso: antes, los dispositivos
        // vienen sin etiqueta y sin distinguir.
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        setPuedeCambiar(
          dispositivos.filter((d) => d.kind === 'videoinput').length > 1,
        );

        setFrontal(usarFrontal);
        setEstado('lista');
      } catch (err) {
        detenerStream();
        setEstado('error');
        setError(mensajeDeError(err));
      }
    },
    [detenerStream],
  );

  const abrir = useCallback(() => iniciar(frontal), [iniciar, frontal]);

  const cerrar = useCallback(() => {
    detenerStream();
    setEstado('inactiva');
    setError(null);
  }, [detenerStream]);

  const cambiarCamara = useCallback(() => iniciar(!frontal), [iniciar, frontal]);

  const capturar = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    // Se reduce aquí, en el navegador: una foto de 1280x1280 sin comprimir son
    // varios MB, y en base64 un 33 % más. Enviar eso por una red de recinto
    // saturada es la diferencia entre 1 segundo y treinta.
    const escala = Math.min(1, LADO_MAXIMO / Math.max(video.videoWidth, video.videoHeight));
    const ancho = Math.round(video.videoWidth * escala);
    const alto = Math.round(video.videoHeight * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (frontal) {
      // La previsualización sale en espejo (es lo natural al verse), así que la
      // captura hay que voltearla para que el texto de la foto no salga al revés.
      ctx.translate(ancho, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, ancho, alto);

    return canvas.toDataURL('image/jpeg', CALIDAD_JPEG);
  }, [frontal]);

  // Si el componente se desmonta con la cámara abierta, el piloto se quedaría
  // encendido para siempre.
  useEffect(() => detenerStream, [detenerStream]);

  return { estado, error, videoRef, abrir, cerrar, capturar, puedeCambiar, cambiarCamara };
}

/** Traduce el error de getUserMedia a algo accionable. */
function mensajeDeError(err: unknown): string {
  if (!(err instanceof Error)) return 'No pudimos abrir la cámara.';

  switch (err.name) {
    case 'NotAllowedError':
      return 'Diste a «bloquear». Permite la cámara en el icono de la barra de direcciones y vuelve a intentarlo.';
    case 'NotFoundError':
      return 'No encontramos ninguna cámara en este dispositivo.';
    case 'NotReadableError':
      return 'Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.';
    case 'OverconstrainedError':
      return 'Tu cámara no admite la configuración pedida.';
    default:
      return 'No pudimos abrir la cámara. Inténtalo de nuevo.';
  }
}
