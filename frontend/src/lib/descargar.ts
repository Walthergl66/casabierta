/**
 * Descarga una imagen remota con un nombre de archivo legible.
 *
 * Un `<a download>` apuntando directamente a la URL de Supabase no funciona:
 * el atributo `download` se ignora en descargas cross-origin y el navegador
 * abriría la imagen en otra pestaña. Por eso se descarga a un blob y se genera
 * una URL local, que sí es del mismo origen.
 */
export async function descargarImagen(url: string, prompt: string): Promise<void> {
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar la imagen (${respuesta.status}).`);
  }

  const blob = await respuesta.blob();
  const urlLocal = URL.createObjectURL(blob);

  try {
    const enlace = document.createElement('a');
    enlace.href = urlLocal;
    enlace.download = nombreDeArchivo(prompt, blob.type);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    // Sin esto, el blob se queda en memoria hasta recargar la página.
    URL.revokeObjectURL(urlLocal);
  }
}

/** Construye un nombre a partir del prompt: `dreamcanvas-gato-astronauta.png`. */
function nombreDeArchivo(prompt: string, mimeType: string): string {
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';

  const base = prompt
    .toLowerCase()
    .normalize('NFD')
    // Quita las tildes: "montaña" → "montana". Los acentos y la ñ dan
    // problemas en algunos sistemas de archivos y al compartir.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');

  return `dreamcanvas-${base || 'imagen'}.${extension}`;
}
