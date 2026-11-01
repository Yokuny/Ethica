import { DISPLAY_TIMEZONE } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import type { DocumentIdentity } from './documentos.schema.js';

// Base comum dos PDFs (AD-119, AD-121). Todo texto que vem do banco passa por `esc`: o HTML
// é montado por concatenação e o Chromium o renderiza sem JavaScript.
export const esc = (value: string | number | undefined | null): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Textos do PDF em pt-BR no servidor, como o e-mail e o feed iCal (exceção da AD-113).
const ROTULOS: Record<string, string> = {
  labor: 'Trabalhista',
  civil: 'Cível',
  federal: 'Federal',
  court_expert: 'Perito do juízo',
  technical_assistant: 'Assistente técnico',
  appointed: 'Nomeada',
  accepted: 'Aceita',
  inspection: 'Vistoria',
  drafting_report: 'Elaborando laudo',
  report_delivered: 'Laudo entregue',
  clarifications: 'Esclarecimentos',
  completed: 'Concluída',
  declined: 'Recusada',
  pending: 'Pendente',
  filed: 'Protocolado',
  missed: 'Perdido',
  report_filed: 'Entrega do laudo',
  fees_notice: 'Notificação de recebimento de honorários',
  clarification_summons: 'Intimação para esclarecimentos',
  supplementary_report_summons: 'Intimação para laudo complementar',
  hearing: 'Audiência',
  meeting: 'Reunião',
  other: 'Outro',
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
  // Campo (AD-130): agentes, documentos e qualidade dos presentes.
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

export const rotulo = (key: string | undefined): string => (key ? (ROTULOS[key] ?? key) : '');

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

export const secao = (titulo: string, conteudo: string): string =>
  `<section><h2>${esc(titulo)}</h2>${conteudo}</section>`;

export const vazio = (texto: string): string => `<p class="vazio">${esc(texto)}</p>`;

// Tabela com cabeçalho; as células já chegam em HTML (escapadas por quem monta).
export const tabela = (colunas: string[], linhas: string[][], classe = ''): string =>
  `<table class="${classe}"><thead><tr>${colunas.map((coluna) => `<th>${esc(coluna)}</th>`).join('')}</tr></thead><tbody>${linhas
    .map((linha) => `<tr>${linha.map((celula) => `<td>${celula}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

// Pares rótulo/valor; valor vazio some.
export const fields = (pares: Array<[string, string | undefined]>): string =>
  `<dl>${pares
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

// Cabeçalho e rodapé do tenant (AD-121): cada linha do texto vira uma linha centralizada e os
// marcadores são trocados. Linha que fica vazia (só `[LOGO]` sem logo) some.
const template = (texto: string, identity: DocumentIdentity, expertName: string): string => {
  const linhas = texto
    .split('\n')
    .map((linha) =>
      esc(linha.trim())
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
  // O template do Chromium não herda o CSS da página: tudo inline e com font-size explícito.
  return `<div style="width:100%;padding:0 16mm;font-family:'Liberation Sans',Arial,sans-serif;font-size:8.5pt;color:#57606a;text-align:center;line-height:1.35;-webkit-print-color-adjust:exact;">${linhas
    .map((linha) => `<div>${linha}</div>`)
    .join('')}</div>`;
};

export const CABECALHO_PADRAO = '[LOGO]\n';
export const RODAPE_PADRAO = 'Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]';

// Textos do cabeçalho e do rodapé do tenant, ou os padrões (AD-121); usados também pelo Word.
export const textosCabecalhoRodape = (identity: DocumentIdentity): { cabecalho: string; rodape: string } => ({
  cabecalho: identity.cabecalho ?? `${CABECALHO_PADRAO}${identity.name}`,
  rodape: identity.rodape ?? RODAPE_PADRAO,
});

export const cabecalhoRodape = (
  identity: DocumentIdentity,
  expertName: string,
): Pick<PdfDocument, 'headerTemplate' | 'footerTemplate'> => {
  const { cabecalho, rodape } = textosCabecalhoRodape(identity);
  return {
    headerTemplate: template(cabecalho, identity, expertName),
    footerTemplate: template(rodape, identity, expertName),
  };
};

export const montarDocumento = (input: {
  titulo: string;
  subtitulo?: string;
  corpo: string;
  identity: DocumentIdentity;
  expertName: string;
  geradoEm: Date;
}): PdfDocument => ({
  html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(input.titulo)}</title><style>${CSS}</style></head><body><h1>${esc(input.titulo)}</h1>${
    input.subtitulo ? `<p class="subtitulo">${esc(input.subtitulo)}</p>` : ''
  }${input.corpo}<p class="gerado">Gerado por ${esc(input.expertName)} em ${esc(dateTime(input.geradoEm))}.</p></body></html>`,
  ...cabecalhoRodape(input.identity, input.expertName),
});
