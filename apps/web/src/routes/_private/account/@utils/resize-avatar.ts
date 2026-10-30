const SIZE = 256;
// Mesmo teto do updateAvatarSchema (@ethica/contracts).
const MAX_LENGTH = 100_000;
const QUALITIES = [0.85, 0.7, 0.5];

// ACC-02: recorta o centro da imagem em quadrado e reduz para 256×256. WebP
// quando o navegador codifica WebP; senão (Safari antigo devolve PNG) JPEG.
// Baixa a qualidade até caber no limite; `null` se nem assim couber.
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
