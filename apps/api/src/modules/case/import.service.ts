import {
  type ApiMessageKey,
  type CasePartyInput,
  type CourtType,
  type CreateCase,
  CSV_IMPORT_COLUMNS,
  CSV_IMPORT_MAX_ROWS,
  CSV_IMPORT_REQUIRED_COLUMNS,
  createCaseSchema,
  documentSchema,
  oabSchema,
  processNumberSchema,
  type Side,
} from '@ethica/contracts';
import { extractText } from 'unpdf';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as caseRepository from './case.repository.js';
import * as caseService from './case.service.js';
import type { CsvImportColumn, CsvImportResult, PdfDraft, PdfExtraction } from './import.schema.js';

// --- Órgão pelo número CNJ (AD-118) ------------------------------------------
// NNNNNNN-DD.AAAA.J.TR.OOOO: J é o segmento da justiça, TR o tribunal.
// Código TR da justiça estadual, em ordem: 01 = AC … 27 = TO.
const STATE_BY_COURT = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SE SP TO'.split(' ');

export const courtUnitFromNumber = (number: string): { courtType: CourtType; court: string } | undefined => {
  const [, j, tr] = number.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/) ?? [];
  const code = Number(tr);
  if (j === '5' && code >= 1 && code <= 24) return { courtType: 'labor', court: `TRT${code}` };
  if (j === '4' && code >= 1 && code <= 6) return { courtType: 'federal', court: `TRF${code}` };
  const uf = STATE_BY_COURT[code - 1];
  if (j === '8' && uf) return { courtType: 'civil', court: `TJ${uf}` };
  return undefined;
};

// --- Datas --------------------------------------------------------------------
const MONTHS = 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split(' ');

// `DD/MM/AAAA` ou `AAAA-MM-DD` → `YYYY-MM-DD`; data impossível (31/02) → undefined.
export const parseData = (raw: string): string | undefined => {
  const value = raw.trim();
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [year, month, day] = br ? [br[3], br[2], br[1]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (!year || !month || !day) return undefined;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return undefined;
  return date.toISOString().slice(0, 10);
};

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// --- Extração da ata/despacho (AD-114) ----------------------------------------
const CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
// Rótulos do cabeçalho do PJe; o advogado que vem depois pertence ao último polo lido.
const LABEL_SIDE: [RegExp, Side][] = [
  [/^(RECLAMANTE|AUTORA?|REQUERENTE|EXEQUENTE)S?\s*:/i, 'plaintiff'],
  [/^(RECLAMAD[OA]|R[ÉE]U|R[ÉE]|REQUERID[OA]|EXECUTAD[OA])S?\s*:/i, 'defendant'],
];
const LABEL_LAWYER = /^ADVOGAD[OA]S?\s*:/i;
const OAB = /OAB\s*[:/]?\s*([A-Z]{2}\s*[\d.]+|[\d.]+\s*\/?\s*[A-Z]{2})/i;
const CPF_CNPJ = /(?:CPF|CNPJ)\s*:?\s*([\d./-]{11,18})/i;

const OBJETOS: [RegExp, string][] = [
  [/insalubridade/i, 'insalubridade'],
  [/periculosidade/i, 'periculosidade'],
  [/ergon[ôo]mic/i, 'ergonomia'],
  [/(per[íi]cia|perito)\s+m[ée]dic|doen[çc]a ocupacional|acidente de trabalho/i, 'médica'],
  [/cont[áa]bil/i, 'contábil'],
  [/grafot[ée]cnic/i, 'grafotécnica'],
  [/engenharia/i, 'engenharia'],
];

const clearName = (raw: string): string =>
  raw
    .replace(CPF_CNPJ, '')
    .replace(OAB, '')
    .replace(/\s+-\s*$|[,;]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractParties = (rows: string[]): CasePartyInput[] => {
  const parties: CasePartyInput[] = [];
  let side: Side | undefined;
  for (const row of rows) {
    const label = LABEL_SIDE.find(([regex]) => regex.test(row));
    if (label) {
      side = label[1];
      const resto = row.replace(label[0], '');
      const name = clearName(resto);
      const document = documentSchema.safeParse(resto.match(CPF_CNPJ)?.[1] ?? '');
      if (name) parties.push({ side, type: 'party', name, document: document.success ? document.data : undefined });
      continue;
    }
    if (side && LABEL_LAWYER.test(row)) {
      const resto = row.replace(LABEL_LAWYER, '');
      const name = clearName(resto);
      const oab = oabSchema.safeParse(resto.match(OAB)?.[1] ?? '');
      if (name) parties.push({ side, type: 'lawyer', name, oab: oab.success ? oab.data : undefined });
    }
  }
  return parties;
};

const extractDivision = (rows: string[], text: string): Pick<PdfDraft, 'division' | 'district'> => {
  const labeledDistrict = text.match(/\b(?:Comarca|Foro)\s+(?:de|da|do)\s+([A-ZÀ-Ú][^\n,–-]*)/)?.[1]?.trim();
  const row = rows.find((l) => /\bVara\b/i.test(l) && l.length <= 120);
  if (!row) return { district: labeledDistrict };
  // "1ª Vara do Trabalho de São Paulo" → vara "1ª Vara do Trabalho", comarca "São Paulo".
  const separada = row.match(/^(.*\bVara\b.*?(?:Trabalho|Federal|C[íi]vel|Criminal)[^\n]*?)\s+de\s+([A-ZÀ-Ú][^\n]*)$/);
  return separada
    ? { division: separada[1]?.trim(), district: labeledDistrict ?? separada[2]?.trim() }
    : { division: row.replace(/\s+da\s+Comarca\s+de\s+.*$/i, '').trim(), district: labeledDistrict };
};

const extractSubject = (text: string): string | undefined => {
  const rotulado = text.match(/\b(?:Objeto|Assunto)s?(?:\s+da\s+per[íi]cia)?\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (rotulado) return rotulado.slice(0, 500);
  const types = OBJETOS.filter(([regex]) => regex.test(text)).map(([, name]) => name);
  return types.length ? `Perícia de ${types.join(' e ')}` : undefined;
};

const extractNomination = (text: string): string | undefined => {
  const frase = text.match(/[^.\n]*\b(nomei|nomead|nomea[çc][ãa]o|design)[^.\n]*/i)?.[0] ?? '';
  const numerica = frase.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (numerica) return parseData(numerica);
  const words = text.match(/(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  const month = words ? MONTHS.indexOf((words[2] ?? '').toLowerCase()) + 1 : 0;
  return words && month ? parseData(`${words[1]}/${month}/${words[3]}`) : undefined;
};

const extractDeadline = (text: string, nomination?: string): { reportDeadline?: string; calculado: boolean } => {
  const frase = text.match(/[^.]*\blaudo\b[^.]*/gi)?.find((f) => /prazo|at[ée]/i.test(f)) ?? '';
  const data = frase.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (data) return { reportDeadline: parseData(data), calculado: false };
  const days = Number(frase.match(/prazo\s+de\s+(\d{1,3})/i)?.[1]);
  return days && nomination ? { reportDeadline: addDays(nomination, days), calculado: true } : { calculado: false };
};

// Função pura: texto da ata/despacho → rascunho do cadastro + o que faltou + avisos.
export const extractMinutes = (text: string): Omit<PdfExtraction, 'existingId'> => {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const warnings: ApiMessageKey[] = [];
  const numbers = [...new Set(text.match(CNJ) ?? [])];
  if (numbers.length > 1) warnings.push('multiple_process_numbers');
  const processNumber = numbers[0] ?? text.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/)?.[0];
  if (processNumber && !processNumberSchema.safeParse(processNumber).success) {
    warnings.push('invalid_process_number');
  }
  const nominationDate = extractNomination(text);
  const { reportDeadline, calculado } = extractDeadline(text, nominationDate);
  if (calculado) warnings.push('deadline_calculated');
  const parties = extractParties(rows);

  const draft: PdfDraft = {
    role: 'court_expert',
    processNumber,
    ...(processNumber ? courtUnitFromNumber(processNumber) : {}),
    ...extractDivision(rows, text),
    subject: extractSubject(text),
    ...(parties.length ? { parties } : {}),
    nominationDate,
    reportDeadline,
  };
  const esperados = [
    'processNumber',
    'court',
    'division',
    'district',
    'subject',
    'parties',
    'nominationDate',
    'reportDeadline',
  ] as const;
  const clean = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined)) as PdfDraft;
  return { draft: clean, missing: esperados.filter((field) => !clean[field]), warnings };
};

export const extractPdf = async (tenantId: string, file: Buffer): Promise<PdfExtraction> => {
  if (!Buffer.isBuffer(file) || file.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new CustomError('unsupported_file_type', 415);
  }
  let text: string;
  try {
    text = (await extractText(new Uint8Array(file), { mergePages: true })).text;
  } catch (error) {
    throw new CustomError('unsupported_file_type', 415, error instanceof Error ? error.message : undefined);
  }
  if (!text.trim()) throw new CustomError('pdf_without_text', 422);

  const extraction = extractMinutes(text);
  const number = extraction.draft.processNumber;
  const existingId = number ? await caseRepository.findIdByNumber(tenantId, number) : undefined;
  if (!existingId) return extraction;
  return { ...extraction, existingId, warnings: [...extraction.warnings, 'expert_case_already_registered'] };
};

// --- CSV (AD-115) ---------------------------------------------------------------
// `;` como separador, aspas duplas para campo com `;`/quebra de linha, BOM ignorado.
export const parseCsv = (text: string): string[][] => {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let aspas = false;
  const font = text.replace(/^﻿/, '');
  for (let i = 0; i < font.length; i++) {
    const c = font[i];
    if (aspas) {
      if (c === '"' && font[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') aspas = false;
      else field += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') {
      record.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && font[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else field += c;
  }
  if (field || record.length) records.push([...record, field]);
  return records;
};

type DeclinedRow = { column?: CsvImportColumn; reason: ApiMessageKey };

const parseCentavos = (raw: string): number | undefined => {
  const limpo = raw.replace(/R\$|\s/g, '');
  const number = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : undefined;
};

const ROLES: Record<string, CreateCase['role']> = {
  '': 'court_expert',
  perito: 'court_expert',
  assistente: 'technical_assistant',
  'assistente técnico': 'technical_assistant',
  'assistente tecnico': 'technical_assistant',
};

const DATES: [CsvImportColumn, keyof CreateCase][] = [
  ['data_nomeacao', 'nominationDate'],
  ['prazo_laudo', 'reportDeadline'],
  ['data_autuacao', 'docketingDate'],
  ['data_admissao', 'hireDate'],
  ['data_demissao', 'terminationDate'],
];

const TEXTS: [CsvImportColumn, keyof CreateCase][] = [
  ['vara', 'division'],
  ['comarca', 'district'],
  ['objeto', 'subject'],
  ['funcao_reclamante', 'claimantJob'],
  ['local_pericia', 'location'],
  ['observacoes', 'notes'],
];

const FIELD_COLUMN: Partial<Record<string, CsvImportColumn>> = Object.fromEntries([
  ['processNumber', 'numero_processo'],
  ['proposedFeesCents', 'honorarios_propostos'],
  ...[...DATES, ...TEXTS].map(([column, field]) => [field, column]),
]);

// Uma linha do CSV → cadastro validado pelo mesmo schema do formulário, ou o motivo da recusa.
export const rowToCase = (get: (column: CsvImportColumn) => string): { data: CreateCase } | DeclinedRow => {
  for (const column of CSV_IMPORT_REQUIRED_COLUMNS) {
    if (!get(column)) return { column: column, reason: 'missing_required_field' };
  }
  const processNumber = get('numero_processo');
  if (!processNumberSchema.safeParse(processNumber).success) {
    return { column: 'numero_processo', reason: 'invalid_process_number' };
  }
  const body = courtUnitFromNumber(processNumber);
  if (!body) return { column: 'numero_processo', reason: 'unsupported_court' };
  const role = ROLES[get('papel').toLowerCase()];
  if (!role) return { column: 'papel', reason: 'invalid_field' };

  const data: Record<string, unknown> = { processNumber, ...body, role };
  for (const [column, field] of TEXTS) if (get(column)) data[field] = get(column);
  for (const [column, field] of DATES) {
    if (!get(column)) continue;
    const day = parseData(get(column));
    if (!day) return { column: column, reason: 'invalid_date' };
    data[field] = day;
  }
  if (get('honorarios_propostos')) {
    const cents = parseCentavos(get('honorarios_propostos'));
    if (cents === undefined) return { column: 'honorarios_propostos', reason: 'invalid_field' };
    data.proposedFeesCents = cents;
  }

  const parties: CasePartyInput[] = [];
  const sides: [Side, 'autor' | 'reu'][] = [
    ['plaintiff', 'autor'],
    ['defendant', 'reu'],
  ];
  for (const [side, prefix] of sides) {
    const document = documentSchema.safeParse(get(`${prefix}_documento`));
    if (!document.success) return { column: `${prefix}_documento`, reason: 'invalid_field' };
    const oab = oabSchema.safeParse(get(`${prefix}_advogado_oab`));
    if (!oab.success) return { column: `${prefix}_advogado_oab`, reason: 'invalid_field' };
    if (get(prefix)) parties.push({ side, type: 'party', name: get(prefix), document: document.data });
    if (get(`${prefix}_advogado`)) {
      parties.push({ side, type: 'lawyer', name: get(`${prefix}_advogado`), oab: oab.data });
    }
  }
  if (parties.length) data.parties = parties;

  const parsed = createCaseSchema.safeParse(data);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '');
    return { column: FIELD_COLUMN[field], reason: 'invalid_field' };
  }
  return { data: parsed.data };
};

// Importa as linhas válidas uma a uma pelo mesmo caminho do formulário e devolve o relatório
// por linha (a linha 1 é o cabeçalho). Número já cadastrado é ignorado sem parar o lote.
export const importCsv = async (tenantId: string, text: string): Promise<CsvImportResult> => {
  const [header, ...records] = parseCsv(typeof text === 'string' ? text : '');
  const rows = records
    .map((fields, index) => ({ fields, line: index + 2 }))
    .filter(({ fields }) => fields.some((field) => field.trim()));
  if (!header || !rows.length) throw new CustomError('csv_empty', 400);
  if (rows.length > CSV_IMPORT_MAX_ROWS) throw new CustomError('csv_too_many_rows', 400);
  const columns = header.map((name) => name.trim().toLowerCase());
  const faltando = CSV_IMPORT_REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (faltando.length) throw new CustomError('csv_invalid_header', 400, faltando.join(', '));
  const position = new Map(
    CSV_IMPORT_COLUMNS.map((column) => [column, columns.indexOf(column)] as const).filter(([, i]) => i >= 0),
  );

  const result: CsvImportResult = { created: 0, skipped: [], rejected: [] };
  for (const { fields, line } of rows) {
    const get = (column: CsvImportColumn) => {
      const i = position.get(column);
      return i === undefined ? '' : (fields[i] ?? '').trim();
    };
    const row = rowToCase(get);
    if (!('data' in row)) {
      result.rejected.push({ line, ...row });
      continue;
    }
    try {
      await caseService.createCase({ ...row.data, tenant: tenantId });
      result.created++;
    } catch (error) {
      if (error instanceof CustomError && error.message === 'expert_case_already_registered') {
        result.skipped.push({ line, processNumber: row.data.processNumber });
      } else if (error instanceof CustomError && error.status < 500) {
        result.rejected.push({ line, reason: error.message });
      } else {
        throw error;
      }
    }
  }
  return result;
};
