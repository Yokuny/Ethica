import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';

// Foto da vistoria (AD-129): reduzida no aparelho (lado maior 1600 px, JPEG) e carimbada com o
// endereço e a data/hora, antes de ir para a fila. Economiza cota e rede móvel.
const LADO_MAXIMO = 1600;
const CAPACITY = 0.82;

const carregar = (file: Blob): Promise<ImageBitmap> => createImageBitmap(file, { imageOrientation: 'from-image' });

export const preparePhoto = async (file: Blob, address: string | undefined, quando = new Date()): Promise<Blob> => {
  const image = await carregar(file);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(image.width, image.height));
  const largura = Math.round(image.width * escala);
  const altura = Math.round(image.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.drawImage(image, 0, 0, largura, altura);
  image.close();
  // Faixa escura no rodapé com o carimbo, legível em qualquer foto.
  const font = Math.max(14, Math.round(largura / 50));
  const texto = [address, formatDateTime(quando.toISOString())].filter(Boolean).join(' · ');
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, altura - font * 2, largura, font * 2);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, font * 0.6, altura - font, largura - font * 1.2);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('falha ao gerar a foto'))),
      'image/jpeg',
      CAPACITY,
    ),
  );
};
