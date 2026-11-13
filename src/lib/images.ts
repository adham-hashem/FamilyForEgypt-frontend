/**
 * Shrinks photos in the browser before they are uploaded. A phone photo is often 4–8 MB; after this it
 * is usually a few hundred kilobytes, so the upload finishes in seconds on mobile data. The server still
 * decodes and re-encodes every image, so this only saves time and never replaces its checks.
 */

/** The largest photo accepted when picking it. It is compressed far below the server's 8 MB limit before upload. */
export const MAX_PICKED_IMAGE = 25 * 1024 * 1024;

const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Larger than any size the server keeps (it stores at most 2400 px), so nothing visible is lost. */
const MAX_SIDE = 2400;
const QUALITY = 0.86;

/** Small images are sent as they are: re-encoding them saves almost nothing. */
const SMALL_ENOUGH = 400 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type) || typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the camera's rotation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // not decodable here; the server gives the proper error
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob = await toBlob(canvas, 'image/webp', QUALITY);
    // Some browsers (older Safari) cannot write WebP and quietly return a PNG instead.
    if (!blob || blob.type !== 'image/webp') {
      // JPEG has no transparency: a cut-out portrait would get a black background, so keep the original.
      if (file.type !== 'image/jpeg') return file;
      blob = await toBlob(canvas, 'image/jpeg', QUALITY);
    }
    if (!blob || blob.size >= file.size) return file;

    const extension = blob.type === 'image/webp' ? '.webp' : '.jpg';
    const name = (file.name.replace(/\.[^.]+$/, '') || 'image') + extension;
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

/** Returns the same form with every photo in it compressed. Field names and order are kept. */
export async function compressForm(form: FormData): Promise<FormData> {
  const entries = [...form.entries()];
  if (!entries.some(([, value]) => value instanceof File && COMPRESSIBLE.has(value.type))) return form;

  const result = new FormData();
  // One photo at a time: decoding several large photos at once can exhaust a phone's memory.
  for (const [key, value] of entries) {
    if (value instanceof File) {
      const file = await compressImage(value);
      result.append(key, file, file.name);
    } else {
      result.append(key, value);
    }
  }
  return result;
}
