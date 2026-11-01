import { TENANT_LOGO_MAX_BYTES, TENANT_LOGO_MAX_SIDE } from '@ethica/contracts';

// AD-120: shrinks the logo (PNG or JPG) to at most 600 px on the longest side and saves it as PNG, which
// keeps transparency. `null` if the image does not open or does not fit the limit.
export async function resizeLogo(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TENANT_LOGO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return png && png.size <= TENANT_LOGO_MAX_BYTES ? png : null;
}
