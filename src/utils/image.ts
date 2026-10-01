const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.85;

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossible de déchiffrer l\'image'));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function resizedCanvas(img: HTMLImageElement, width: number, height: number, background?: string): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Compresse une image côté client avant envoi : redimensionnement à 1600 px max
 * puis encodage WebP q≈0.85 (repli JPEG). Un fichier de 5 Mo descend en général
 * vers ~200 Ko, ce qui supprime les 413 et accélère les uploads.
 *
 * - GIF animés : livrés tels quels (une recompression casserait l'animation)
 * - échec quelconque (décodage, canvas, navigateur ancien) : fichier original
 * - si la compression n'amène rien (fichier déjà plus petit) : fichier original
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(objectUrl);
    if (!img.naturalWidth || !img.naturalHeight) return file;

    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    // 1) WebP (transparence conservée)
    let canvas = resizedCanvas(img, width, height);
    if (!canvas) return file;
    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      // 2) Repli JPEG sur fond blanc (les navigateurs sans WebP rendent du PNG)
      canvas = resizedCanvas(img, width, height, '#ffffff');
      if (!canvas) return file;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }
    if (!blob || blob.size >= file.size) return file;

    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.${extension}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
