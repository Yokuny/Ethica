import { numberSections, type ReportLayout, sectionTitle } from '@ethica/contracts';
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
.capa { min-height: 230mm; display: flex; flex-direction: column; break-after: page; }
.capa .logo { display: block; max-height: 38mm; max-width: 60mm; margin: 12mm auto 0; }
.capa .tipo { font-size: 26pt; font-weight: 700; text-align: center; margin: 24mm 0 6mm; color: ${layout.titleColor}; }
.capa .subtitulo { font-style: italic; text-align: center; margin: 0; color: #555; }
.capa table { margin-top: 18mm; font-size: ${layout.fontSize - 1}pt; }
.capa th { width: 30%; background: #fff; text-transform: uppercase; }
.capa th, .capa td { border-color: #bbb; padding: 2.5mm 3mm; }
.capa .rodape-capa { margin-top: auto; }
.data { text-align: right; margin: 10mm 0 0; color: #444; }
.assinatura { text-align: right; margin-top: 14mm; break-inside: avoid; }
.assinatura p { text-align: right; margin: 0; color: #444; }
.assinatura .nome { color: ${layout.titleColor}; }
.abertura { break-after: page; }
.abertura .juizo { font-weight: 700; text-transform: uppercase; margin: 0 0 8mm; }
.abertura .tipo-abertura { text-align: center; font-weight: 700; font-size: ${layout.fontSize + 2}pt; margin: 10mm 0 2mm; color: ${layout.titleColor}; }
.abertura .texto { text-indent: 15mm; }
.fecho { margin-top: 10mm; break-inside: avoid; }
.fecho .fim { font-weight: 700; }
.sumario { break-after: page; }
.sumario h1, .titulo-sumario { font-size: ${layout.fontSize + 3}pt; font-weight: 700; margin: 0 0 6mm; padding-bottom: 2mm; border-bottom: 0.4mm solid ${layout.titleColor}; color: ${layout.titleColor}; }
.sumario ol { list-style: none; padding: 0; margin: 0; }
.sumario li { margin-bottom: 2mm; }
.sumario .n1 { font-weight: 700; text-transform: uppercase; margin-top: 3mm; }
.sumario .n2 { padding-left: 8mm; }
.sumario .n3 { padding-left: 16mm; }
.secao.quebra { break-before: page; }
.titulo-secao { font-size: ${layout.fontSize + 0.5}pt; font-weight: 700; margin: 6mm 0 3mm; break-after: avoid; color: ${layout.titleColor}; }
.titulo-secao.n1 { font-size: ${layout.fontSize + 2}pt; text-transform: uppercase; padding-bottom: 1.5mm; border-bottom: 0.4mm solid ${layout.titleColor}; }
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
  label && amount ? `<tr><th>${esc(label)}</th><td>${esc(amount)}</td></tr>` : '';

// An inspection photo becomes a data URL (Chromium runs without network, AD-119/AD-129); one that is gone is dropped.
const withPhotos = (html: string, photos: ReportExportData['photos']): string =>
  html.replace(/<img([^>]*)src="([^"]+)"([^>]*)>/g, (_tag, antes: string, src: string, depois: string) => {
    const photo = photos[src];
    return photo ? `<img${antes}src="data:${photo.mime};base64,${photo.body.toString('base64')}"${depois}>` : '';
  });

const cm = (value: number): string => `${value * 10}mm`;

// Report header and footer in the expert's layout (AD-206), with the data of whoever signs and the office logo:
// only where the office (or the technical responsible) did not write its own text in Escritório.
const reportHeaderFooter = ({
  report,
  legalCase,
  identity,
  expert,
}: ReportExportData): Pick<PdfDocument, 'headerTemplate' | 'footerTemplate'> => {
  const { layout } = report;
  const office = headerFooter(identity, expert.name);
  // Chromium draws these apart from the page CSS: everything inline, aligned with the page margins.
  const frame = (inner: string, style: string): string =>
    `<div style="width:100%;box-sizing:border-box;padding:0 ${cm(layout.marginRight)} 0 ${cm(layout.marginLeft)};font-family:${PDF_FONTS[layout.font]};color:#444;line-height:1.3;-webkit-print-color-adjust:exact;"><div style="display:flex;justify-content:space-between;${style}">${inner}</div></div>`;
  const credentials = [expert.education, expert.professionalRegistration && `(${expert.professionalRegistration})`]
    .filter(Boolean)
    .join(' ');
  const header = frame(
    `<div><div style="font-weight:700;text-transform:uppercase;color:${layout.titleColor};">${esc(expert.name)}</div><div>${ROLE[report.type]}</div>${credentials ? `<div>${esc(credentials)}</div>` : ''}</div>${
      identity.logoDataUrl ? `<img src="${identity.logoDataUrl}" style="max-height:14mm;max-width:40mm;">` : ''
    }`,
    `align-items:flex-end;font-size:8pt;padding-bottom:2mm;border-bottom:0.4mm solid ${layout.titleColor};`,
  );
  const contact = [expert.education, expert.professionalRegistration, expert.phone && `Tel. ${expert.phone}`]
    .filter(Boolean)
    .join(' · ');
  const footer = frame(
    `<div>${
      legalCase.processNumber ? `<div>Processo nº ${esc(legalCase.processNumber)}</div>` : ''
    }<div>${esc(expert.name)}</div>${contact ? `<div>${esc(contact)}</div>` : ''}</div><div style="font-weight:700;font-size:8pt;"><span class="pageNumber"></span></div>`,
    'align-items:flex-start;font-size:7pt;padding-top:1.5mm;border-top:0.3mm solid #999;',
  );
  return {
    headerTemplate: identity.header === undefined ? header : office.headerTemplate,
    footerTemplate: identity.footer === undefined ? footer : office.footerTemplate,
  };
};

export const reportHtml = (data: ReportExportData): PdfDocument => {
  const { report, legalCase, identity, expert, values, photos } = data;
  const { layout } = report;
  const numbers = numberSections(report.sections);
  const numbered = (i: number, section: { title: string; level: number }) =>
    `${numbers[i] ? `${numbers[i]}. ` : ''}${esc(sectionTitle(section.title, section.level))}`;
  const signature = `<div class="assinatura"><p class="nome"><strong>${esc(expert.name)}</strong></p><p>${ROLE[report.type]}</p>${[
    expert.education,
    expert.professionalRegistration,
  ]
    .filter(Boolean)
    .map((row) => `<p>${esc(row)}</p>`)
    .join('')}</div>`;
  const date = `<p class="data">${esc(values['[DATA_EXTENSO]'])}</p>`;
  // Expert's cover (AD-203): logo, title, inspection and place, the case table, date and signature.
  const subtitle = [
    values['[DATA_VISTORIA]'] && `Diligência pericial de ${values['[DATA_VISTORIA]']}`,
    legalCase.location,
  ].filter(Boolean);
  const cover = `<section class="capa">${
    identity.logoDataUrl ? `<img class="logo" src="${identity.logoDataUrl}" alt="">` : ''
  }<p class="tipo">${OPENING_TYPE[report.type]}</p>${subtitle
    .map((row) => `<p class="subtitulo">${esc(row)}</p>`)
    .join('')}<table><tbody>${[
    coverRow('Processo', legalCase.processNumber),
    coverRow('OS', legalCase.serviceOrder),
    coverRow('Juízo', [legalCase.division, legalCase.district].filter(Boolean).join(' — ') || undefined),
    coverRow(values['[DENOMINACAO_AUTOR]'], values['[NOME_AUTOR]']),
    coverRow(values['[DENOMINACAO_REU]'], values['[NOME_REU]']),
    coverRow(ROLE[report.type], expert.name),
  ].join('')}</tbody></table><div class="rodape-capa">${date}${signature}</div></section>`;
  // Page to the judge (NLA-04), in the words of the expert's model.
  const credentials = [
    expert.education,
    expert.professionalRegistration && `inscrito(a) no ${expert.professionalRegistration}`,
  ]
    .filter(Boolean)
    .map((row) => `, ${esc(row)}`)
    .join('');
  const opening = `<section class="abertura"><p class="juizo">EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DA ${esc(
    (legalCase.division ?? 'VARA').toUpperCase(),
  )}</p>${
    legalCase.processNumber ? `<p><strong>Processo:</strong> ${esc(legalCase.processNumber)}</p>` : ''
  }<p class="tipo-abertura">${OPENING_TYPE[report.type]}</p><p class="texto"><strong>${esc(
    expert.name.toUpperCase(),
  )}</strong>${credentials}, ${
    ROLE[report.type]
  } nos autos do processo em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, apresentar o ${
    OPENING_TYPE[report.type]
  }${values['[DATA_VISTORIA]'] ? ` referente à diligência realizada em ${esc(values['[DATA_VISTORIA]'])}` : ''}${
    legalCase.location ? `, ${esc(legalCase.location)}` : ''
  }, nos termos dos arts. 473 e 477 do CPC, pelas razões técnicas a seguir expostas.</p>${date}${signature}</section>`;
  const closing = `<section class="fecho"><p class="fim">${
    report.type === 'report' ? 'É o laudo.' : 'É o parecer.'
  }</p>${date}${signature}</section>`;
  const summary = `<section class="sumario"><p class="titulo-sumario">SUMÁRIO</p><ol>${report.sections
    .map((section, i) => `<li class="n${section.level}">${numbered(i, section)}</li>`)
    .join('')}</ol></section>`;
  const sections = report.sections
    .map((section, i) => {
      const level = Math.min(section.level, 3);
      const tag = `h${level + 1}`;
      return `<section class="secao${section.pageBreak ? ' quebra' : ''}"><${tag} class="titulo-secao n${level}">${numbered(i, section)}</${tag}>${section.titleOnly ? '' : withPhotos(section.html, photos)}</section>`;
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
    ...reportHeaderFooter(data),
    margin: {
      top: cm(layout.marginTop),
      bottom: cm(layout.marginBottom),
      left: cm(layout.marginLeft),
      right: cm(layout.marginRight),
    },
  };
};
