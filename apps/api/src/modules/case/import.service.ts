import {
  type ApiMessageKey,
  type CasePartyInput,
  type CourtType,
  type CreateCase,
  CSV_IMPORT_COLUMNS,
  CSV_IMPORT_MAX_ROWS,
  CSV_IMPORT_REQUIRED_COLUMNS,
  createCaseSchema,
  documentoSchema,
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
const UF_POR_TR = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SE SP TO'.split(' ');

export const orgaoDoNumero = (numero: string): { courtType: CourtType; court: string } | undefined => {
  const [, j, tr] = numero.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/) ?? [];
  const codigo = Number(tr);
  if (j === '5' && codigo >= 1 && codigo <= 24) return { courtType: 'labor', court: `TRT${codigo}` };
  if (j === '4' && codigo >= 1 && codigo <= 6) return { courtType: 'federal', court: `TRF${codigo}` };
  const uf = UF_POR_TR[codigo - 1];
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

const limparNome = (raw: string): string =>
  raw
    .replace(CPF_CNPJ, '')
    .replace(OAB, '')
    .replace(/\s+-\s*$|[,;]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractParties = (linhas: string[]): CasePartyInput[] => {
  const parties: CasePartyInput[] = [];
  let side: Side | undefined;
  for (const linha of linhas) {
    const rotulo = LABEL_SIDE.find(([regex]) => regex.test(linha));
    if (rotulo) {
      side = rotulo[1];
      const resto = linha.replace(rotulo[0], '');
      const nome = limparNome(resto);
      const documento = documentoSchema.safeParse(resto.match(CPF_CNPJ)?.[1] ?? '');
      if (nome) parties.push({ side, tipo: 'party', nome, documento: documento.success ? documento.data : undefined });
      continue;
    }
    if (side && LABEL_LAWYER.test(linha)) {
      const resto = linha.replace(LABEL_LAWYER, '');
      const nome = limparNome(resto);
      const oab = oabSchema.safeParse(resto.match(OAB)?.[1] ?? '');
      if (nome) parties.push({ side, tipo: 'lawyer', nome, oab: oab.success ? oab.data : undefined });
    }
  }
  return parties;
};

const extractDivision = (linhas: string[], texto: string): Pick<PdfDraft, 'division' | 'district'> => {
  const labeledDistrict = texto.match(/\b(?:Comarca|Foro)\s+(?:de|da|do)\s+([A-ZÀ-Ú][^\n,–-]*)/)?.[1]?.trim();
  const linha = linhas.find((l) => /\bVara\b/i.test(l) && l.length <= 120);
  if (!linha) return { district: labeledDistrict };
  // "1ª Vara do Trabalho de São Paulo" → vara "1ª Vara do Trabalho", comarca "São Paulo".
  const separada = linha.match(
    /^(.*\bVara\b.*?(?:Trabalho|Federal|C[íi]vel|Criminal)[^\n]*?)\s+de\s+([A-ZÀ-Ú][^\n]*)$/,
  );
  return separada
    ? { division: separada[1]?.trim(), district: labeledDistrict ?? separada[2]?.trim() }
    : { division: linha.replace(/\s+da\s+Comarca\s+de\s+.*$/i, '').trim(), district: labeledDistrict };
};

const extractSubject = (texto: string): string | undefined => {
  const rotulado = texto.match(/\b(?:Objeto|Assunto)s?(?:\s+da\s+per[íi]cia)?\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (rotulado) return rotulado.slice(0, 500);
  const tipos = OBJETOS.filter(([regex]) => regex.test(texto)).map(([, nome]) => nome);
  return tipos.length ? `Perícia de ${tipos.join(' e ')}` : undefined;
};

const extractNomination = (texto: string): string | undefined => {
  const frase = texto.match(/[^.\n]*\b(nomei|nomead|nomea[çc][ãa]o|design)[^.\n]*/i)?.[0] ?? '';
  const numerica = frase.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (numerica) return parseData(numerica);
  const words = texto.match(/(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  const month = words ? MONTHS.indexOf((words[2] ?? '').toLowerCase()) + 1 : 0;
  return words && month ? parseData(`${words[1]}/${month}/${words[3]}`) : undefined;
};

const extractDeadline = (texto: string, nomination?: string): { reportDeadline?: string; calculado: boolean } => {
  const frase = texto.match(/[^.]*\blaudo\b[^.]*/gi)?.find((f) => /prazo|at[ée]/i.test(f)) ?? '';
  const data = frase.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (data) return { reportDeadline: parseData(data), calculado: false };
  const days = Number(frase.match(/prazo\s+de\s+(\d{1,3})/i)?.[1]);
  return days && nomination ? { reportDeadline: addDays(nomination, days), calculado: true } : { calculado: false };
};

// Função pura: texto da ata/despacho → rascunho do cadastro + o que faltou + avisos.
export const extractMinutes = (texto: string): Omit<PdfExtraction, 'existingId'> => {
  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
  const warnings: ApiMessageKey[] = [];
  const numeros = [...new Set(texto.match(CNJ) ?? [])];
  if (numeros.length > 1) warnings.push('multiple_process_numbers');
  const processNumber = numeros[0] ?? texto.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/)?.[0];
  if (processNumber && !processNumberSchema.safeParse(processNumber).success) {
    warnings.push('invalid_process_number');
  }
  const nominationDate = extractNomination(texto);
  const { reportDeadline, calculado } = extractDeadline(texto, nominationDate);
  if (calculado) warnings.push('deadline_calculated');
  const parties = extractParties(linhas);

  const draft: PdfDraft = {
    role: 'court_expert',
    processNumber,
    ...(processNumber ? orgaoDoNumero(processNumber) : {}),
    ...extractDivision(linhas, texto),
    subject: extractSubject(texto),
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

export const extrairPdf = async (tenantId: string, arquivo: Buffer): Promise<PdfExtraction> => {
  if (!Buffer.isBuffer(arquivo) || arquivo.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new CustomError('unsupported_file_type', 415);
  }
  let texto: string;
  try {
    texto = (await extractText(new Uint8Array(arquivo), { mergePages: true })).text;
  } catch (error) {
    throw new CustomError('unsupported_file_type', 415, error instanceof Error ? error.message : undefined);
  }
  if (!texto.trim()) throw new CustomError('pdf_without_text', 422);

  const extraction = extractMinutes(texto);
  const numero = extraction.draft.processNumber;
  const existingId = numero ? await caseRepository.findIdByNumero(tenantId, numero) : undefined;
  if (!existingId) return extraction;
  return { ...extraction, existingId, warnings: [...extraction.warnings, 'expert_case_already_registered'] };
};

// --- CSV (AD-115) ---------------------------------------------------------------
// `;` como separador, aspas duplas para campo com `;`/quebra de linha, BOM ignorado.
export const parseCsv = (texto: string): string[][] => {
  const registros: string[][] = [];
  let field = '';
  let registro: string[] = [];
  let aspas = false;
  const fonte = texto.replace(/^﻿/, '');
  for (let i = 0; i < fonte.length; i++) {
    const c = fonte[i];
    if (aspas) {
      if (c === '"' && fonte[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') aspas = false;
      else field += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') {
      registro.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && fonte[i + 1] === '\n') i++;
      registro.push(field);
      registros.push(registro);
      registro = [];
      field = '';
    } else field += c;
  }
  if (field || registro.length) registros.push([...registro, field]);
  return registros;
};

type LinhaRecusada = { column?: CsvImportColumn; reason: ApiMessageKey };

const parseCentavos = (raw: string): number | undefined => {
  const limpo = raw.replace(/R\$|\s/g, '');
  const numero = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) : undefined;
};

const ROLES: Record<string, CreateCase['role']> = {
  '': 'court_expert',
  perito: 'court_expert',
  assistente: 'technical_assistant',
  'assistente técnico': 'technical_assistant',
  'assistente tecnico': 'technical_assistant',
};

const DATAS: [CsvImportColumn, keyof CreateCase][] = [
  ['data_nomeacao', 'nominationDate'],
  ['prazo_laudo', 'reportDeadline'],
  ['data_autuacao', 'docketingDate'],
  ['data_admissao', 'hireDate'],
  ['data_demissao', 'terminationDate'],
];

const TEXTOS: [CsvImportColumn, keyof CreateCase][] = [
  ['vara', 'division'],
  ['comarca', 'district'],
  ['objeto', 'subject'],
  ['funcao_reclamante', 'claimantJob'],
  ['local_pericia', 'location'],
  ['observacoes', 'observacoes'],
];

const FIELD_COLUMN: Partial<Record<string, CsvImportColumn>> = Object.fromEntries([
  ['processNumber', 'numero_processo'],
  ['proposedFeesCents', 'honorarios_propostos'],
  ...[...DATAS, ...TEXTOS].map(([coluna, field]) => [field, coluna]),
]);

// Uma linha do CSV → cadastro validado pelo mesmo schema do formulário, ou o motivo da recusa.
export const rowToCase = (get: (coluna: CsvImportColumn) => string): { data: CreateCase } | LinhaRecusada => {
  for (const coluna of CSV_IMPORT_REQUIRED_COLUMNS) {
    if (!get(coluna)) return { column: coluna, reason: 'missing_required_field' };
  }
  const processNumber = get('numero_processo');
  if (!processNumberSchema.safeParse(processNumber).success) {
    return { column: 'numero_processo', reason: 'invalid_process_number' };
  }
  const orgao = orgaoDoNumero(processNumber);
  if (!orgao) return { column: 'numero_processo', reason: 'unsupported_court' };
  const role = ROLES[get('papel').toLowerCase()];
  if (!role) return { column: 'papel', reason: 'invalid_field' };

  const data: Record<string, unknown> = { processNumber, ...orgao, role };
  for (const [coluna, field] of TEXTOS) if (get(coluna)) data[field] = get(coluna);
  for (const [coluna, field] of DATAS) {
    if (!get(coluna)) continue;
    const day = parseData(get(coluna));
    if (!day) return { column: coluna, reason: 'invalid_date' };
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
  for (const [side, prefixo] of sides) {
    const documento = documentoSchema.safeParse(get(`${prefixo}_documento`));
    if (!documento.success) return { column: `${prefixo}_documento`, reason: 'invalid_field' };
    const oab = oabSchema.safeParse(get(`${prefixo}_advogado_oab`));
    if (!oab.success) return { column: `${prefixo}_advogado_oab`, reason: 'invalid_field' };
    if (get(prefixo)) parties.push({ side, tipo: 'party', nome: get(prefixo), documento: documento.data });
    if (get(`${prefixo}_advogado`)) {
      parties.push({ side, tipo: 'lawyer', nome: get(`${prefixo}_advogado`), oab: oab.data });
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
export const importCsv = async (tenantId: string, texto: string): Promise<CsvImportResult> => {
  const [cabecalho, ...registros] = parseCsv(typeof texto === 'string' ? texto : '');
  const linhas = registros
    .map((fields, index) => ({ fields, line: index + 2 }))
    .filter(({ fields }) => fields.some((field) => field.trim()));
  if (!cabecalho || !linhas.length) throw new CustomError('csv_empty', 400);
  if (linhas.length > CSV_IMPORT_MAX_ROWS) throw new CustomError('csv_too_many_rows', 400);
  const colunas = cabecalho.map((nome) => nome.trim().toLowerCase());
  const faltando = CSV_IMPORT_REQUIRED_COLUMNS.filter((coluna) => !colunas.includes(coluna));
  if (faltando.length) throw new CustomError('csv_invalid_header', 400, faltando.join(', '));
  const posicao = new Map(
    CSV_IMPORT_COLUMNS.map((coluna) => [coluna, colunas.indexOf(coluna)] as const).filter(([, i]) => i >= 0),
  );

  const result: CsvImportResult = { created: 0, skipped: [], rejected: [] };
  for (const { fields, line } of linhas) {
    const get = (coluna: CsvImportColumn) => {
      const i = posicao.get(coluna);
      return i === undefined ? '' : (fields[i] ?? '').trim();
    };
    const linha = rowToCase(get);
    if (!('data' in linha)) {
      result.rejected.push({ line, ...linha });
      continue;
    }
    try {
      await caseService.createCase({ ...linha.data, tenant: tenantId });
      result.created++;
    } catch (error) {
      if (error instanceof CustomError && error.message === 'expert_case_already_registered') {
        result.skipped.push({ line, processNumber: linha.data.processNumber });
      } else if (error instanceof CustomError && error.status < 500) {
        result.rejected.push({ line, reason: error.message });
      } else {
        throw error;
      }
    }
  }
  return result;
};
