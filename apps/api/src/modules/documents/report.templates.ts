import { numberSections } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import { esc, headerFooter } from './document.layout.js';
import type { ReportExportData } from './report.schema.js';

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

const TYPE = { report: 'LAUDO PERICIAL', technical_opinion: 'PARECER TÉCNICO' } as const;

const coverRow = (label: string | undefined, amount: string | undefined): string =>
  label && amount ? `<div><dt>${esc(label)}:</dt><dd>${esc(amount)}</dd></div>` : '';

// Foto da vistoria vira data URL (o Chromium roda sem rede, AD-119/AD-129); a que sumiu sai.
const withPhotos = (html: string, photos: ReportExportData['photos']): string =>
  html.replace(/<img([^>]*)src="([^"]+)"([^>]*)>/g, (_tag, antes: string, src: string, depois: string) => {
    const photo = photos[src];
    return photo ? `<img${antes}src="data:${photo.mime};base64,${photo.body.toString('base64')}"${depois}>` : '';
  });

export const reportHtml = ({ report, legalCase, identity, expert, values, photos }: ReportExportData): PdfDocument => {
  const numbers = numberSections(report.sections);
  const cover = `<section class="capa"><div><p class="tipo">${TYPE[report.type]}</p><dl>${[
    coverRow('Processo nº', legalCase.processNumber),
    coverRow('Juízo', [legalCase.division, legalCase.district].filter(Boolean).join(' — ') || undefined),
    coverRow('Tribunal', legalCase.court),
    coverRow(values['[DENOMINACAO_AUTOR]'], values['[NOME_AUTOR]']),
    coverRow(values['[DENOMINACAO_REU]'], values['[NOME_REU]']),
    coverRow('Objeto', legalCase.subject),
  ].join('')}</dl></div><div class="assinatura"><p><strong>${esc(expert.name)}</strong></p>${[
    expert.education,
    expert.professionalRegistration,
  ]
    .filter(Boolean)
    .map((row) => `<p>${esc(row)}</p>`)
    .join('')}<p>${esc(values['[DATA_EXTENSO]'])}</p></div></section>`;
  const summary = `<section class="sumario"><p class="titulo-sumario"><strong>SUMÁRIO</strong></p><ol>${report.sections
    .map((section, i) => `<li class="n${section.level}">${numbers[i]}. ${esc(section.title)}</li>`)
    .join('')}</ol></section>`;
  const sections = report.sections
    .map((section, i) => {
      const level = Math.min(section.level, 3);
      const tag = `h${level + 1}`;
      return `<section class="secao${section.pageBreak ? ' quebra' : ''}"><${tag} class="titulo-secao n${level}">${numbers[i]}. ${esc(section.title)}</${tag}>${section.titleOnly ? '' : withPhotos(section.html, photos)}</section>`;
    })
    .join('');
  return {
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(TYPE[report.type])} ${esc(legalCase.processNumber)}</title><style>${CSS}</style></head><body>${cover}${summary}${sections}</body></html>`,
    ...headerFooter(identity, expert.name),
  };
};
