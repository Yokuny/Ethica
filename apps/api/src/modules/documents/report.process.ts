import { parseData } from '../case/import.service.js';
import { esc } from './document.layout.js';
import type { ProcessExtraction, ProcessQuestionSide } from './report.schema.js';

// Reading of the full process (LMO-03, AD-152): rules over the PDF text, like the minutes (AD-114).
// Nothing here is certain: what is not found is listed and the expert checks everything.

const MAX_QUESTIONS = 60;
const MAX_QUESTION_LENGTH = 1000;

// "Quesitos do reclamante", "QUESITOS DA RECLAMADA", "Quesitos do Juízo", "quesitos apresentados pela autora".
const QUESTIONS_HEADING =
  /^\s*quesitos\s+(?:apresentados\s+|formulados\s+)?(?:pel[oa]s?|d[oa]s?)\s+(?:(?:parte|douto|d\.)\s+)?(reclamante|autora?|requerente|reclamad[oa]|r[ée]u?|requerid[oa]|ju[ií]zo|magistrad[oa])\b/i;
const SIDE_OF: Array<[RegExp, ProcessQuestionSide]> = [
  [/^(reclamante|autora?|requerente)$/i, 'plaintiff'],
  [/^(reclamad[oa]|r[ée]u?|requerid[oa])$/i, 'defendant'],
  [/^(ju[ií]zo|magistrad[oa])$/i, 'court'],
];
// "1)", "1.", "1 -", "1º", "01 –" at the start of the line.
const ITEM = /^\s*(\d{1,2})\s*(?:[).ºª°]|\s[-–—])\s*(.*)$/;
// End of a block of questions: closing of the petition or another document.
const END = /^\s*(termos em que|nestes termos|pede deferimento|requer|excelent[íi]ssim|quesitos\b)/i;

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION_LENGTH);

const extractQuestions = (rows: string[]): ProcessExtraction['questions'] => {
  const questions: ProcessExtraction['questions'] = { plaintiff: [], defendant: [], court: [] };
  for (let i = 0; i < rows.length; i++) {
    const heading = rows[i]?.match(QUESTIONS_HEADING)?.[1] ?? '';
    const side = SIDE_OF.find(([regex]) => regex.test(heading))?.[1];
    // The same side again (petition repeated in the process) keeps the first list found.
    if (!side || questions[side].length) continue;
    const items: string[] = [];
    for (let j = i + 1; j < rows.length && items.length < MAX_QUESTIONS; j++) {
      const row = rows[j] as string;
      const item = row.match(ITEM);
      if (item) items.push(item[2] ?? '');
      else if (END.test(row)) break;
      else if (items.length) items[items.length - 1] += ` ${row}`;
    }
    questions[side] = items.map(clean).filter(Boolean);
  }
  return questions;
};

const DATE = String.raw`(\d{1,2}\/\d{1,2}\/\d{4})`;
const firstDate = (text: string, patterns: RegExp[]): string | undefined => {
  for (const pattern of patterns) {
    const found = text.match(pattern)?.[1];
    const date = found ? parseData(found) : undefined;
    if (date) return date;
  }
  return undefined;
};

const extractLabor = (text: string): ProcessExtraction['labor'] => {
  const hireDate = firstDate(text, [
    new RegExp(String.raw`data\s+de\s+admiss[ãa]o\s*:?\s*${DATE}`, 'i'),
    new RegExp(String.raw`admitid[oa]\s+(?:pela\s+reclamada\s+)?(?:em|no\s+dia|aos?)\s+${DATE}`, 'i'),
  ]);
  const terminationDate = firstDate(text, [
    new RegExp(String.raw`data\s+d[ae]\s+(?:demiss[ãa]o|dispensa|desligamento|rescis[ãa]o)\s*:?\s*${DATE}`, 'i'),
    new RegExp(
      String.raw`(?:dispensad[oa]|demitid[oa]|desligad[oa])\s+(?:sem\s+justa\s+causa\s+)?(?:em|no\s+dia|aos?)\s+${DATE}`,
      'i',
    ),
  ]);
  const claimantJob = (
    text.match(/\bfun[çc][ãa]o\s*:\s*([^\n;]{3,60})/i)?.[1] ??
    text.match(
      /\b(?:exercendo|exercia|exerceu|para\s+exercer|contratad[oa]\s+para)\s+a\s+fun[çc][ãa]o\s+de\s+([^\n,.;]{3,60})/i,
    )?.[1]
  )?.trim();
  const location = text.match(/\blocal\s+de\s+trabalho\s*:\s*([^\n;]{5,200})/i)?.[1]?.trim();
  return {
    ...(hireDate ? { hireDate } : {}),
    ...(terminationDate ? { terminationDate } : {}),
    ...(claimantJob ? { claimantJob } : {}),
    ...(location ? { location } : {}),
  };
};

const AGENTS: Array<[RegExp, string]> = [
  [/\bru[íi]do\b/i, 'ruído'],
  [/\bcalor\b/i, 'calor'],
  [/\bfrio\b|c[âa]mara\s+fria|c[âa]mara\s+frigor/i, 'frio'],
  [/\bumidade\b/i, 'umidade'],
  [/\bvibra[çc]/i, 'vibrações'],
  [/agentes?\s+qu[íi]mic|hidrocarbonet|[óo]leos?\s+minera|graxa/i, 'agentes químicos'],
  [/\bbenzeno\b/i, 'benzeno'],
  [/poeira|s[íi]lica|amianto|asbesto/i, 'poeiras minerais'],
  [/agentes?\s+biol[óo]gic|lixo\s+urbano|esgoto|pacientes?\s+em\s+isolamento/i, 'agentes biológicos'],
  [/radia[çc][õo]es?\s+ionizante/i, 'radiações ionizantes'],
  [/inflam[áa]ve|combust[íi]ve/i, 'inflamáveis'],
  [/energia\s+el[ée]trica|eletricidade|sistema\s+el[ée]trico\s+de\s+pot[êe]ncia/i, 'energia elétrica'],
  [/explosiv/i, 'explosivos'],
  [/motocicleta|motoboy/i, 'motocicleta'],
  [/vigil[âa]ncia|seguran[çc]a\s+patrimonial/i, 'segurança patrimonial'],
];

// What the initial petition asks: the additional pay requested and, with it, the agents mentioned.
const extractClaims = (text: string): Pick<ProcessExtraction, 'claims' | 'agents'> => {
  const claims = [
    /adicional\s+de\s+insalubridade/i.test(text) && 'adicional de insalubridade',
    /adicional\s+de\s+periculosidade/i.test(text) && 'adicional de periculosidade',
  ].filter((claim): claim is string => Boolean(claim));
  const agents = claims.length ? AGENTS.filter(([regex]) => regex.test(text)).map(([, agent]) => agent) : [];
  return { claims, agents };
};

export const extractProcess = (text: string): ProcessExtraction => {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  return { questions: extractQuestions(rows), labor: extractLabor(text), ...extractClaims(text) };
};

const QUESTION_SECTION: Array<[RegExp, ProcessQuestionSide]> = [
  [/ju[ií]zo/i, 'court'],
  [/reclamad|r[ée]u\b|\br[ée]\b|requerid/i, 'defendant'],
  [/reclamante|autor|requerente/i, 'plaintiff'],
];
// Template placeholder text that the questions found replace; any other text is kept and they are appended.
const PLACEHOLDER = /\(transcrever o quesito\)|Não foram apresentados quesitos/;

const joinList = (items: string[]): string =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}` : (items[0] ?? '');

// Sections that change with what was read: questions in the "Quesitos …" sections (by the title) and
// the claims at the end of "Objetivo". Only the changed ones are returned; nothing written is deleted.
export const applyProcess = <T extends { id: string; title: string; titleOnly: boolean; html: string }>(
  sections: T[],
  { questions, claims, agents }: ProcessExtraction,
): T[] =>
  sections.flatMap((section): T[] => {
    if (section.titleOnly) return [];
    if (/^\s*quesitos\b/i.test(section.title)) {
      const side = QUESTION_SECTION.find(([regex]) => regex.test(section.title))?.[1];
      const found = side ? questions[side] : [];
      if (!found.length) return [];
      const html = found
        .map((question, i) => `<p><strong>Quesito ${i + 1}:</strong> ${esc(question)}</p><p>Resposta: (responder).</p>`)
        .join('');
      return [{ ...section, html: PLACEHOLDER.test(section.html) ? html : `${section.html}${html}` }];
    }
    if (/^\s*objetivo\s*$/i.test(section.title) && claims.length && !section.html.includes('Pedidos da inicial')) {
      const text = `Pedidos da inicial: ${joinList(claims)}${agents.length ? `, com alegação de ${joinList(agents)}` : ''}.`;
      return [{ ...section, html: `${section.html}<p>${esc(text)}</p>` }];
    }
    return [];
  });
