import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';

// Inspection photo (AD-129): shrunk on the device (longest side 1600 px, JPEG) and stamped with the
// address and date/time, before going into the queue. Saves quota and mobile data.
const MAX_SIDE = 1600;
const CAPACITY = 0.82;

const load = (file: Blob): Promise<ImageBitmap> => createImageBitmap(file, { imageOrientation: 'from-image' });

export const preparePhoto = async (file: Blob, address: string | undefined, quando = new Date()): Promise<Blob> => {
  const image = await load(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.drawImage(image, 0, 0, width, height);
  image.close();
  // Dark strip at the bottom with the stamp, readable on any photo.
  const font = Math.max(14, Math.round(width / 50));
  const text = [address, formatDateTime(quando.toISOString())].filter(Boolean).join(' · ');
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, height - font * 2, width, font * 2);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, font * 0.6, height - font, width - font * 1.2);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('falha ao gerar a foto'))),
      'image/jpeg',
      CAPACITY,
    ),
  );
};
