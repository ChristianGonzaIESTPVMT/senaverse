export const PHOTO_INPUT_LIMIT = 5 * 1024 * 1024;
export const PHOTO_STORED_LIMIT = 192 * 1024;
export const PHOTO_SIZE = 256;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type DecodedPhoto = { source: CanvasImageSource; width: number; height: number; dispose: () => void };

export function sniffPhotoType(bytes: Uint8Array): typeof PHOTO_TYPES[number] | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function validatePhotoFile(blob: Blob, limit = PHOTO_INPUT_LIMIT) {
  if (!blob.size || blob.size > limit) throw new Error(limit === PHOTO_INPUT_LIMIT ? 'Elige una imagen de hasta 5 MB.' : 'La foto procesada supera el límite de 192 KB.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = sniffPhotoType(bytes);
  if (!type || (blob.type && blob.type !== type)) throw new Error('El archivo debe ser una imagen JPG, PNG o WebP válida.');
  const dimensions = imageDimensions(bytes, type);
  if (dimensions && (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 24_000_000 || dimensions.width > 12000 || dimensions.height > 12000)) {
    throw new Error('La imagen es demasiado grande. Elige una de hasta 24 megapíxeles y 12000 píxeles por lado.');
  }
  return type;
}

/** Check encoded dimensions before allocating a decoded bitmap. Decoding is still required. */
export function imageDimensions(bytes: Uint8Array, type: string): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === 'image/png' && bytes.length >= 24) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (type === 'image/webp' && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === 'VP8 ') return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === 'VP8L') { const bits = view.getUint32(21, true); return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) }; }
  }
  if (type === 'image/jpeg') {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset++] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      if (offset + 8 >= bytes.length) return null;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) return null;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      offset += length;
    }
  }
  return null;
}

export async function decodePhoto(blob: Blob): Promise<DecodedPhoto> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
    }
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) };
    } catch (error) { URL.revokeObjectURL(url); throw error; }
  } catch { throw new Error('No se pudo leer la imagen. Elige otro archivo JPG, PNG o WebP.'); }
}

export async function openPhotoFile(blob: Blob) {
  await validatePhotoFile(blob);
  const decoded = await decodePhoto(blob);
  if (!decoded.width || !decoded.height || decoded.width * decoded.height > 24_000_000) {
    decoded.dispose();
    throw new Error('La imagen es demasiado grande. Elige una de hasta 24 megapíxeles.');
  }
  return decoded;
}

export function photoCrop(width: number, height: number, zoom = 1, horizontal = 0, vertical = 0) {
  const size = Math.min(width, height) / Math.max(1, Math.min(3, zoom));
  return {
    x: (width - size) * (Math.max(-100, Math.min(100, horizontal)) + 100) / 200,
    y: (height - size) * (Math.max(-100, Math.min(100, vertical)) + 100) / 200,
    size,
  };
}

export function drawPhotoCrop(canvas: HTMLCanvasElement, decoded: DecodedPhoto, zoom: number, horizontal: number, vertical: number) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no permite procesar la foto.');
  const crop = photoCrop(decoded.width, decoded.height, zoom, horizontal, vertical);
  canvas.width = canvas.height = PHOTO_SIZE;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  context.drawImage(decoded.source, crop.x, crop.y, crop.size, crop.size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
}

export async function encodePhoto(canvas: HTMLCanvasElement) {
  const encode = (type: string) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto.')), type, .9));
  let blob = await encode('image/webp');
  if (blob.type !== 'image/webp') {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, PHOTO_SIZE, PHOTO_SIZE).data;
    const transparent = pixels.some((value, index) => index % 4 === 3 && value < 255);
    blob = await encode(transparent ? 'image/png' : 'image/jpeg');
  }
  await validatePhotoFile(blob, PHOTO_STORED_LIMIT);
  return blob;
}

export async function validateStoredPhoto(blob: Blob) {
  await validatePhotoFile(blob, PHOTO_STORED_LIMIT);
  const image = await decodePhoto(blob);
  try { if (image.width !== PHOTO_SIZE || image.height !== PHOTO_SIZE) throw new Error('La foto guardada debe medir 256 × 256 píxeles.'); }
  finally { image.dispose(); }
}
