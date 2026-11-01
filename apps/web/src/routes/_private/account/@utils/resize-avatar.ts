const SIZE = 256;
// Same ceiling as updateAvatarSchema (@ethica/contracts).
const MAX_LENGTH = 100_000;
const QUALITIES = [0.85, 0.7, 0.5];

// ACC-02: crops the center of the image into a square and shrinks it to 256×256. WebP
// when the browser encodes WebP; otherwise (old Safari returns PNG) JPEG.
// Lowers the quality until it fits the limit; `null` if it still does not fit.
export async function resizeAvatar(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas
    .getContext('2d')
    ?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  const type = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
  for (const quality of QUALITIES) {
    const dataUrl = canvas.toDataURL(type, quality);
    if (dataUrl.length <= MAX_LENGTH) return dataUrl;
  }
  return null;
}
