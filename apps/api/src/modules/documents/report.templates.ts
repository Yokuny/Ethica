import { numberSections, type ReportLayout } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import { esc, headerFooter, PDF_FONTS } from './document.layout.js';
import type { ReportExportData } from './report.schema.js';

// Report as PDF (LAU-03.2, AD-119): cover, table of contents and numbered sections. The section HTML already
// arrives sanitized (AD-123) with the variables resolved; titles are text and are escaped here. Font, spacing,
// margins, title color and which pages leave come from the report layout (NLA-06).
const css = (layout: ReportLayout) => `
* { box-sizing: border-box; }
body { font-family: ${PDF_FONTS[layout.font]}; font-size: ${layout.fontSize}pt; line-height: ${layout.lineHeight}; color: #111; margin: 0; }
p { margin: 0 0 ${layout.paragraphSpacing}pt; text-align: justify; }
.capa { min-height: 220mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.capa .tipo { font-size: 20pt; font-weight: 700; text-align: center; letter-spacing: 0.08em; margin: 30mm 0 14mm; color: ${layout.titleColor}; }
.capa dl { margin: 0; }
.capa dl div { display: grid; grid-template-columns: 42mm 1fr; gap: 4mm; margin-bottom: 2.5mm; }
.capa dt { font-weight: 700; }
.capa dd { margin: 0; }
.assinatura { text-align: center; margin-top: 14mm; break-inside: avoid; }
.assinatura p { text-align: center; margin: 0; }
.abertura { break-after: page; }
.abertura .centro { text-align: center; font-weight: 700; margin: 6mm 0; color: ${layout.titleColor}; }
.fecho { margin-top: 10mm; break-inside: avoid; }
.sumario { break-after: page; }
.sumario h1, .titulo-sumario { font-size: 14pt; text-align: center; margin: 0 0 6mm; color: ${layout.titleColor}; }
.sumario ol { list-style: none; padding: 0; margin: 0; }
.sumario li { margin-bottom: 1.5mm; }
.sumario .n2 { padding-left: 8mm; }
.sumario .n3 { padding-left: 16mm; }
.secao.quebra { break-before: page; }
.titulo-secao { font-size: ${layout.fontSize + 0.5}pt; font-weight: 700; margin: 6mm 0 3mm; break-after: avoid; color: ${layout.titleColor}; }
.titulo-secao.n1 { text-transform: uppercase; }
h3, h4 { font-size: ${layout.fontSize}pt; margin: 4mm 0 2mm; break-after: avoid; }
ul, ol { margin: 0 0 3mm; padding-left: 8mm; }
li p { margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: ${layout.fontSize - 1.5}pt; margin: 2mm 0 4mm; }
th, td { border: 0.3mm solid #444; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
th { background: #eee; }
td p, th p { margin: 0; text-align: left; }
tr { break-inside: avoid; }
img { display: block; max-width: 100%; max-height: 120mm; margin: 3mm auto 1mm; break-inside: avoid; }
table:has(img) { table-layout: fixed; }
td img { max-height: 60mm; margin: 1mm auto; }
td:has(img) p { text-align: center; }
`;

const TYPE = { report: 'LAUDO PERICIAL', technical_opinion: 'PARECER TÉCNICO' } as const;
const OPENING_TYPE = { report: 'LAUDO TÉCNICO PERICIAL', technical_opinion: 'PARECER TÉCNICO' } as const;
const ROLE = { report: 'Perito(a) do Juízo', technical_opinion: 'Assistente Técnico(a)' } as const;

const coverRow = (label: string | undefined, amount: string | undefined): string =>
  label && amount ? `<div><dt>${esc(label)}:</dt><dd>${esc(amount)}</dd></div>` : '';

// An inspection photo becomes a data URL (Chromium runs without network, AD-119/AD-129); one that is gone is dropped.
const withPhotos = (html: string, photos: ReportExportData['photos']): string =>
  html.replace(/<img([^>]*)src="([^"]+)"([^>]*)>/g, (_tag, antes: string, src: string, depois: string) => {
    const photo = photos[src];
    return photo ? `<img${antes}src="data:${photo.mime};base64,${photo.body.toString('base64')}"${depois}>` : '';
  });

const cm = (value: number): string => `${value * 10}mm`;

export const reportHtml = ({ report, legalCase, identity, expert, values, photos }: ReportExportData): PdfDocument => {
  const { layout } = report;
  const numbers = numberSections(report.sections);
  const numbered = (i: number, title: string) => `${numbers[i] ? `${numbers[i]}. ` : ''}${esc(title)}`;
  const signature = `<div class="assinatura"><p><strong>${esc(expert.name)}</strong></p><p>${ROLE[report.type]}</p>${[
    expert.education,
    expert.professionalRegistration,
  ]
    .filter(Boolean)
    .map((row) => `<p>${esc(row)}</p>`)
    .join('')}</div>`;
  const cover = `<section class="capa"><div><p class="tipo">${TYPE[report.type]}</p><dl>${[
    coverRow('Processo nº', legalCase.processNumber),
    coverRow('OS', legalCase.serviceOrder),
    coverRow('Juízo', [legalCase.division, legalCase.district].filter(Boolean).join(' — ') || undefined),
    coverRow('Tribunal', legalCase.court),
    coverRow(values['[DENOMINACAO_AUTOR]'], values['[NOME_AUTOR]']),
    coverRow(values['[DENOMINACAO_REU]'], values['[NOME_REU]']),
    coverRow('Objeto', legalCase.subject),
  ].join(
    '',
  )}</dl></div><div><p style="text-align:center">${esc(values['[DATA_EXTENSO]'])}</p>${signature}</div></section>`;
  // Page to the judge (NLA-04), in the words of the expert's model.
  const credentials = [
    expert.education,
    expert.professionalRegistration && `inscrito(a) no ${expert.professionalRegistration}`,
  ]
    .filter(Boolean)
    .map((row) => `, ${esc(row)}`)
    .join('');
  const opening = `<section class="abertura"><p class="centro">EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DA ${esc(
    (legalCase.division ?? 'VARA').toUpperCase(),
  )}</p>${legalCase.processNumber ? `<p>Processo: ${esc(legalCase.processNumber)}</p>` : ''}<p class="centro">${
    OPENING_TYPE[report.type]
  }<br>${esc(legalCase.subject.toUpperCase())}</p><p><strong>${esc(expert.name.toUpperCase())}</strong>${credentials}, ${
    ROLE[report.type]
  } nos autos do processo em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, apresentar o ${
    OPENING_TYPE[report.type]
  }, nos termos dos arts. 473 e 477 do CPC, pelas razões técnicas a seguir expostas.</p><p>${esc(
    values['[DATA_EXTENSO]'],
  )}</p>${signature}</section>`;
  const closing = `<section class="fecho"><p>${report.type === 'report' ? 'É o laudo.' : 'É o parecer.'}</p><p>${esc(
    values['[DATA_EXTENSO]'],
  )}</p>${signature}</section>`;
  const summary = `<section class="sumario"><p class="titulo-sumario"><strong>SUMÁRIO</strong></p><ol>${report.sections
    .map((section, i) => `<li class="n${section.level}">${numbered(i, section.title)}</li>`)
    .join('')}</ol></section>`;
  const sections = report.sections
    .map((section, i) => {
      const level = Math.min(section.level, 3);
      const tag = `h${level + 1}`;
      return `<section class="secao${section.pageBreak ? ' quebra' : ''}"><${tag} class="titulo-secao n${level}">${numbered(i, section.title)}</${tag}>${section.titleOnly ? '' : withPhotos(section.html, photos)}</section>`;
    })
    .join('');
  const body = [
    layout.cover ? cover : '',
    layout.summary ? summary : '',
    layout.opening ? opening : '',
    sections,
    layout.opening ? closing : '',
  ].join('');
  return {
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(TYPE[report.type])} ${esc(legalCase.processNumber)}</title><style>${css(layout)}</style></head><body>${body}</body></html>`,
    ...headerFooter(identity, expert.name),
    margin: {
      top: cm(layout.marginTop),
      bottom: cm(layout.marginBottom),
      left: cm(layout.marginLeft),
      right: cm(layout.marginRight),
    },
  };
};
