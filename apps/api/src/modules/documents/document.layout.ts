import { DISPLAY_TIMEZONE, type DocumentTextStyle, type ReportFont } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import type { DocumentIdentity } from './documents.schema.js';

// Common base of the PDFs (AD-119, AD-121). Every text that comes from the database goes through `esc`: the HTML
// is built by concatenation and Chromium renders it without JavaScript.
export const esc = (value: string | number | undefined | null): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// PDF texts in pt-BR on the server, like the e-mail and the iCal feed (AD-113 exception).
const LABELS: Record<string, string> = {
  labor: 'Trabalhista',
  civil: 'Cível',
  federal: 'Federal',
  court_expert: 'Perito do juízo',
  technical_assistant: 'Assistente técnico',
  // Service phase and status (AD-178); `inspection` is the appointment type.
  nomination_accepted: 'Nomeação aceita',
  fee_proposal: 'Elaboração de proposta de honorários',
  document_request: 'Solicitação de documentos',
  awaiting_scheduling: 'Aguardando agendamento perícia / Elaborar checklist',
  awaiting_report_approval: 'Aguardando aprovação laudo',
  awaiting_pje_signature: 'Aguardando assinatura Perito no PJE',
  awaiting_site_info: 'Aguardando info do local perícia',
  awaiting_inspection: 'Aguardando perícia',
  inspection_scheduled: 'Perícia agendada',
  inspection_done: 'Perícia realizada',
  withdrawal: 'Desistência do processo',
  removal: 'Destituição',
  settlement: 'Acordo entre as partes',
  drafting_report: 'Laudo em elaboração',
  pending_documents: 'Documentos pendentes',
  reviewing_report: 'Laudo em revisão',
  report_delivered: 'Laudo entregue - aguardar impugnação das Partes',
  objection_reply_1: 'Responder impugnação 1',
  objection_return_1: 'Aguardando retorno da impugnação 1 pelas Partes',
  objection_reply_2: 'Responder impugnação 2',
  objection_return_2: 'Aguardando retorno da impugnação 2 pelas Partes',
  objection_reply_3: 'Responder impugnação 3',
  objection_return_3: 'Aguardando retorno da impugnação 3 pelas Partes',
  objection_reply_4: 'Responder impugnação 4',
  objection_return_4: 'Aguardando retorno da impugnação 4 pelas Partes',
  awaiting_clarification_approval: 'Aguardando aprovação resposta aos esclarecimentos',
  awaiting_clarification_response: 'Aguardando resposta dos esclarecimentos apresentados',
  awaiting_new_clarifications: 'Aguardando novos esclarecimentos',
  awaiting_judge: 'Aguardando resposta do Juiz',
  evidence_closed: 'Prova pericial encerrada / Monitorar honorários',
  fees_received: 'Honorários recebidos',
  environmental_assessment: 'Retornar p/ avaliações ambientais',
  supplement_inspection: 'Retornar p/ complementar a perícia',
  petition: 'Elaborar manifestação / petição',
  active: 'Ativo',
  suspended: 'Suspenso',
  inspection: 'Vistoria',
  pending: 'Pendente',
  filed: 'Protocolado',
  missed: 'Perdido',
  report_filed: 'Entrega do laudo',
  fees_notice: 'Notificação de recebimento de honorários',
  clarification_summons: 'Intimação para esclarecimentos',
  supplementary_report_summons: 'Intimação para laudo complementar',
  hearing: 'Audiência',
  meeting: 'Reunião',
  scheduled: 'Agendado',
  done: 'Concluído',
  canceled: 'Cancelado',
  advance_fees: 'Honorários adiantados',
  fixed_fees: 'Honorários fixados',
  travel: 'Deslocamento',
  supplies: 'Materiais',
  fees_and_taxes: 'Taxas e impostos',
  other_expenses: 'Outras despesas',
  movement: 'última movimentação',
  appointment: 'nomeação, sem movimentação',
  created: 'cadastro, sem movimentação',
  // Field (AD-130): agents, documents and attendee capacity.
  noise: 'Ruído',
  heat: 'Calor',
  cold: 'Frio',
  humidity: 'Umidade',
  chemicals: 'Agentes químicos',
  biological_agents: 'Agentes biológicos',
  hazardous: 'Periculosidade (inflamáveis, explosivos, eletricidade, radiação)',
  risk_program: 'PGR / PPRA',
  ltcat: 'LTCAT',
  pcmso: 'PCMSO',
  ppe_records: 'Fichas de entrega de EPI (com CA)',
  ppp: 'PPP',
  job_description: 'Descrição da função / ordem de serviço',
  witness: 'Testemunha',
};

export const label = (key: string | undefined): string => (key ? (LABELS[key] ?? key) : '');

export const day = (value: string | undefined): string => {
  if (!value) return '';
  const [year, month, d] = value.split('-');
  return `${d}/${month}/${year}`;
};

export const dateTime = (value: Date): string =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: DISPLAY_TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(
    value,
  );

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const dinheiro = (cents: number | undefined): string => (cents === undefined ? '' : brl.format(cents / 100));

export const section = (title: string, conteudo: string): string =>
  `<section><h2>${esc(title)}</h2>${conteudo}</section>`;

export const empty = (text: string): string => `<p class="vazio">${esc(text)}</p>`;

// Table with a header; the cells already arrive as HTML (escaped by whoever builds them).
export const table = (columns: string[], rows: string[][], caseClass = ''): string =>
  `<table class="${caseClass}"><thead><tr>${columns.map((column) => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

// Label/value pairs; an empty value is dropped.
export const fields = (pairs: Array<[string, string | undefined]>): string =>
  `<dl>${pairs
    .filter(([, amount]) => amount)
    .map(([fieldLabel, amount]) => `<div><dt>${esc(fieldLabel)}</dt><dd>${esc(amount)}</dd></div>`)
    .join('')}</dl>`;

const CSS = `
* { box-sizing: border-box; }
body { font-family: 'Liberation Sans', Arial, sans-serif; font-size: 10.5pt; color: #1f2328; margin: 0; }
h1 { font-size: 16pt; margin: 0 0 2mm; }
.subtitulo { color: #57606a; margin: 0 0 6mm; }
h2 { font-size: 11.5pt; margin: 7mm 0 2.5mm; padding-bottom: 1.5mm; border-bottom: 0.4mm solid #d0d7de; }
section { break-inside: auto; }
dl { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm 6mm; margin: 0; }
dl div { break-inside: avoid; }
dt { font-size: 8.5pt; color: #57606a; }
dd { margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th, td { border: 0.3mm solid #d0d7de; padding: 1.8mm 2mm; text-align: left; vertical-align: top; }
th { background: #f6f8fa; font-weight: 600; }
tr { break-inside: avoid; }
td.num, th.num { text-align: right; white-space: nowrap; }
.vazio { color: #57606a; font-style: italic; margin: 0; }
.alerta { font-weight: 600; color: #9a6700; }
.vencido { font-weight: 600; color: #cf222e; }
.linhas td { height: 9mm; }
.caixa { display: inline-block; width: 3.5mm; height: 3.5mm; border: 0.3mm solid #1f2328; vertical-align: middle; }
.totais { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.totais div { border: 0.3mm solid #d0d7de; padding: 2.5mm; }
.totais dt { margin-bottom: 1mm; }
.totais dd { font-size: 12pt; font-weight: 600; }
.anotacoes { border: 0.3mm solid #d0d7de; height: 60mm; break-inside: avoid; }
.gerado { margin-top: 8mm; font-size: 8.5pt; color: #57606a; }
`;

// Fonts of the PDF: Chromium in the server has Liberation, Carlito and Caladea (metric-compatible with Times,
// Arial, Calibri and Cambria) and Source Sans 3, the current name of Source Sans Pro (Dockerfile).
export const PDF_FONTS: Record<ReportFont, string> = {
  times: "'Liberation Serif', 'Times New Roman', serif",
  arial: "'Liberation Sans', Arial, sans-serif",
  calibri: 'Calibri, Carlito, sans-serif',
  cambria: 'Cambria, Caladea, serif',
  source_sans: "'Source Sans Pro', 'Source Sans 3', sans-serif",
};

// Tenant header and footer (AD-121): each text line becomes a line in the office font, size and
// alignment (AD-172) and the markers are replaced. A line left empty (only `[LOGO]` without a logo) is dropped.
const template = (text: string, style: DocumentTextStyle, identity: DocumentIdentity, expertName: string): string => {
  const rows = text
    .split('\n')
    .map((row) =>
      esc(row.trim())
        .replaceAll(
          '[LOGO]',
          identity.logoDataUrl ? `<img src="${identity.logoDataUrl}" style="max-height:12mm;max-width:60mm;">` : '',
        )
        .replaceAll('[NOME_PERITO]', esc(expertName))
        .replaceAll('[PAGINA_ATUAL]', '<span class="pageNumber"></span>')
        .replaceAll('[TOTAL_PAGINAS]', '<span class="totalPages"></span>')
        .trim(),
    )
    .filter(Boolean);
  // The Chromium template does not inherit the page CSS: everything inline and with an explicit font-size.
  return `<div style="width:100%;padding:0 16mm;font-family:${PDF_FONTS[style.font]};font-size:${style.fontSize}pt;color:#57606a;text-align:${style.align};line-height:1.35;-webkit-print-color-adjust:exact;">${rows
    .map((row) => `<div>${row}</div>`)
    .join('')}</div>`;
};

export const DEFAULT_HEADER = '[LOGO]\n';
export const DEFAULT_FOOTER = 'Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]';

// Tenant header and footer texts, or the defaults (AD-121); also used by Word.
export const textsHeaderFooter = (identity: DocumentIdentity): { header: string; footer: string } => ({
  header: identity.header ?? `${DEFAULT_HEADER}${identity.name}`,
  footer: identity.footer ?? DEFAULT_FOOTER,
});

export const headerFooter = (
  identity: DocumentIdentity,
  expertName: string,
): Pick<PdfDocument, 'headerTemplate' | 'footerTemplate'> => {
  const { header, footer } = textsHeaderFooter(identity);
  return {
    headerTemplate: template(header, identity.headerStyle, identity, expertName),
    footerTemplate: template(footer, identity.footerStyle, identity, expertName),
  };
};

export const buildDocument = (input: {
  title: string;
  subtitle?: string;
  body: string;
  identity: DocumentIdentity;
  expertName: string;
  generatedAt: Date;
}): PdfDocument => ({
  html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(input.title)}</title><style>${CSS}</style></head><body><h1>${esc(input.title)}</h1>${
    input.subtitle ? `<p class="subtitulo">${esc(input.subtitle)}</p>` : ''
  }${input.body}<p class="gerado">Gerado por ${esc(input.expertName)} em ${esc(dateTime(input.generatedAt))}.</p></body></html>`,
  ...headerFooter(input.identity, input.expertName),
});
