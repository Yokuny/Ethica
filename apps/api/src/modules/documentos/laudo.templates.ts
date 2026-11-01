import { numerarSecoes } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import { cabecalhoRodape, esc } from './documento.layout.js';
import type { LaudoExportDados } from './laudo.schema.js';

// Laudo em PDF (LAU-03.2, AD-119): capa, sumário e seções numeradas. O HTML das seções já
// chega saneado (AD-123) e com as variáveis resolvidas; títulos são texto e são escapados aqui.
const CSS = `
* { box-sizing: border-box; }
body { font-family: 'Liberation Serif', 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 0; }
p { margin: 0 0 3mm; text-align: justify; }
.capa { min-height: 220mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.capa .tipo { font-size: 20pt; font-weight: 700; text-align: center; letter-spacing: 0.08em; margin: 30mm 0 14mm; }
.capa dl { margin: 0; }
.capa dl div { display: grid; grid-template-columns: 42mm 1fr; gap: 4mm; margin-bottom: 2.5mm; }
.capa dt { font-weight: 700; }
.capa dd { margin: 0; }
.capa .assinatura { text-align: center; }
.capa .assinatura p { text-align: center; margin: 0; }
.sumario { break-after: page; }
.sumario h1, .titulo-sumario { font-size: 14pt; text-align: center; margin: 0 0 6mm; }
.sumario ol { list-style: none; padding: 0; margin: 0; }
.sumario li { margin-bottom: 1.5mm; }
.sumario .n2 { padding-left: 8mm; }
.sumario .n3 { padding-left: 16mm; }
.secao.quebra { break-before: page; }
.titulo-secao { font-size: 12.5pt; font-weight: 700; margin: 6mm 0 3mm; break-after: avoid; }
.titulo-secao.n1 { text-transform: uppercase; }
h3, h4 { font-size: 12pt; margin: 4mm 0 2mm; break-after: avoid; }
ul, ol { margin: 0 0 3mm; padding-left: 8mm; }
li p { margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 2mm 0 4mm; }
th, td { border: 0.3mm solid #444; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
th { background: #eee; }
td p, th p { margin: 0; text-align: left; }
tr { break-inside: avoid; }
img { display: block; max-width: 100%; max-height: 120mm; margin: 3mm auto 1mm; break-inside: avoid; }
`;

const TIPO = { report: 'LAUDO PERICIAL', technical_opinion: 'PARECER TÉCNICO' } as const;

const coverRow = (rotulo: string | undefined, valor: string | undefined): string =>
  rotulo && valor ? `<div><dt>${esc(rotulo)}:</dt><dd>${esc(valor)}</dd></div>` : '';

// Foto da vistoria vira data URL (o Chromium roda sem rede, AD-119/AD-129); a que sumiu sai.
const withPhotos = (html: string, photos: LaudoExportDados['photos']): string =>
  html.replace(/<img([^>]*)src="([^"]+)"([^>]*)>/g, (_tag, antes: string, src: string, depois: string) => {
    const photo = photos[src];
    return photo ? `<img${antes}src="data:${photo.mime};base64,${photo.body.toString('base64')}"${depois}>` : '';
  });

export const laudoHtml = ({ laudo, legalCase, identity, expert, valores, photos }: LaudoExportDados): PdfDocument => {
  const numeros = numerarSecoes(laudo.secoes);
  const cover = `<section class="capa"><div><p class="tipo">${TIPO[laudo.tipo]}</p><dl>${[
    coverRow('Processo nº', legalCase.processNumber),
    coverRow('Juízo', [legalCase.division, legalCase.district].filter(Boolean).join(' — ') || undefined),
    coverRow('Tribunal', legalCase.court),
    coverRow(valores['[DENOMINACAO_AUTOR]'], valores['[NOME_AUTOR]']),
    coverRow(valores['[DENOMINACAO_REU]'], valores['[NOME_REU]']),
    coverRow('Objeto', legalCase.subject),
  ].join('')}</dl></div><div class="assinatura"><p><strong>${esc(expert.name)}</strong></p>${[
    expert.formacao,
    expert.registroProfissional,
  ]
    .filter(Boolean)
    .map((linha) => `<p>${esc(linha)}</p>`)
    .join('')}<p>${esc(valores['[DATA_EXTENSO]'])}</p></div></section>`;
  const sumario = `<section class="sumario"><p class="titulo-sumario"><strong>SUMÁRIO</strong></p><ol>${laudo.secoes
    .map((secao, i) => `<li class="n${secao.nivel}">${numeros[i]}. ${esc(secao.titulo)}</li>`)
    .join('')}</ol></section>`;
  const secoes = laudo.secoes
    .map((secao, i) => {
      const nivel = Math.min(secao.nivel, 3);
      const tag = `h${nivel + 1}`;
      return `<section class="secao${secao.quebraPagina ? ' quebra' : ''}"><${tag} class="titulo-secao n${nivel}">${numeros[i]}. ${esc(secao.titulo)}</${tag}>${secao.apenasTitulo ? '' : withPhotos(secao.html, photos)}</section>`;
    })
    .join('');
  return {
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(TIPO[laudo.tipo])} ${esc(legalCase.processNumber)}</title><style>${CSS}</style></head><body>${cover}${sumario}${secoes}</body></html>`,
    ...cabecalhoRodape(identity, expert.name),
  };
};
