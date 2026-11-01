import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';

// Foto da vistoria (AD-129): reduzida no aparelho (lado maior 1600 px, JPEG) e carimbada com o
// endereço e a data/hora, antes de ir para a fila. Economiza cota e rede móvel.
const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;

const carregar = (arquivo: Blob): Promise<ImageBitmap> =>
  createImageBitmap(arquivo, { imageOrientation: 'from-image' });

export const prepararFoto = async (arquivo: Blob, endereco: string | undefined, quando = new Date()): Promise<Blob> => {
  const imagem = await carregar(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
  const largura = Math.round(imagem.width * escala);
  const altura = Math.round(imagem.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  // Faixa escura no rodapé com o carimbo, legível em qualquer foto.
  const fonte = Math.max(14, Math.round(largura / 50));
  const texto = [endereco, formatDateTime(quando.toISOString())].filter(Boolean).join(' · ');
  ctx.font = `600 ${fonte}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, altura - fonte * 2, largura, fonte * 2);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, fonte * 0.6, altura - fonte, largura - fonte * 1.2);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('falha ao gerar a foto'))),
      'image/jpeg',
      QUALIDADE,
    ),
  );
};
