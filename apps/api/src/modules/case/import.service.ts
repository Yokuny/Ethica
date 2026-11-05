import {
  type ApiMessageKey,
  type CasePartyInput,
  type CasePhase,
  type CaseRole,
  type CaseStatus,
  type CourtType,
  type CreateCase,
  CSV_IMPORT_MAX_ROWS,
  type CsvImportField,
  casePhases,
  creaSchema,
  createCaseFieldsSchema,
  createCaseSchema,
  csvHeaderKey,
  documentSchema,
  isOwnType,
  oabSchema,
  partyNameKey,
  processNumberSchema,
  type Side,
  suggestCsvField,
  usesContractor,
} from '@ethica/contracts';
import { extractText } from 'unpdf';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as caseRepository from './case.repository.js';
import * as caseService from './case.service.js';
import type { CsvColumn, CsvImportResult, PdfDraft, PdfExtraction } from './import.schema.js';

// --- Court from the CNJ number (AD-118) ---------------------------------------
// NNNNNNN-DD.AAAA.J.TR.OOOO: J is the court branch segment, TR the court.
// TR code of the state courts, in order: 01 = AC … 27 = TO.
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

// `DD/MM/AAAA` or `AAAA-MM-DD` → `YYYY-MM-DD`; impossible date (31/02) → undefined.
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

// --- Extraction from the minutes/order (AD-114) -------------------------------
const CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
// PJe header labels; the lawyer that comes next belongs to the last side read.
const LABEL_SIDE: [RegExp, Side][] = [
  [/^(RECLAMANTE|AUTORA?|REQUERENTE|EXEQUENTE)S?\s*:/i, 'plaintiff'],
  [/^(RECLAMAD[OA]|R[ÉE]U|R[ÉE]|REQUERID[OA]|EXECUTAD[OA])S?\s*:/i, 'defendant'],
];
const LABEL_LAWYER = /^ADVOGAD[OA]S?\s*:/i;
const OAB = /OAB\s*[:/]?\s*([A-Z]{2}\s*[\d.]+|[\d.]+\s*\/?\s*[A-Z]{2})/i;
const CPF_CNPJ = /(?:CPF|CNPJ)\s*:?\s*([\d./-]{11,18})/i;
// Registration and contacts beside the name (PSV-06): "CREA/SC 184822-0", e-mail and phone with area code.
const CREA = /CREA\s*[-/:]?\s*([A-Z]{2})?\s*(?:n[ºo°.]*\s*)?([\d.-]{4,})/i;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /\(?\b\d{2}\)?\s*9?\d{4}-?\d{4}\b/;

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
    .replace(CREA, '')
    .replace(EMAIL, '')
    .replace(PHONE, '')
    .replace(/\b(?:e-?mail|telefone|tel\.?|fone)\s*:?/gi, '')
    .replace(/(\s*-\s*)+$/, '')
    .replace(/\s+-\s*$|[,;]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

// CREA, e-mail and phone found in the row; what is not valid is left out.
const contacts = (row: string): Pick<CasePartyInput, 'crea' | 'email' | 'phone'> => {
  const creaMatch = row.match(CREA);
  const crea = creaSchema.safeParse(creaMatch ? `${creaMatch[1] ?? ''}${creaMatch[2]}` : '');
  const email = row.match(EMAIL)?.[0];
  const phone = row.replace(CPF_CNPJ, '').replace(CREA, '').replace(OAB, '').match(PHONE)?.[0];
  return {
    ...(crea.success && crea.data ? { crea: crea.data } : {}),
    ...(email ? { email: email.toLowerCase() } : {}),
    ...(phone ? { phone: phone.trim() } : {}),
  };
};

// Parties read from one header block of rows (side and lawyer labels).
const partiesOfBlock = (rows: string[]): CasePartyInput[] => {
  const parties: CasePartyInput[] = [];
  const add = (party: CasePartyInput) => {
    const same = (other: CasePartyInput) =>
      other.side === party.side && other.type === party.type && partyNameKey(other.name) === partyNameKey(party.name);
    if (!parties.some(same)) parties.push(party);
  };
  let side: Side | undefined;
  for (const row of rows) {
    const label = LABEL_SIDE.find(([regex]) => regex.test(row));
    if (label) {
      side = label[1];
      const resto = row.replace(label[0], '');
      const name = clearName(resto);
      const document = documentSchema.safeParse(resto.match(CPF_CNPJ)?.[1] ?? '');
      if (name) {
        add({ side, type: 'party', name, document: document.success ? document.data : undefined, ...contacts(resto) });
      }
      continue;
    }
    if (side && LABEL_LAWYER.test(row)) {
      const resto = row.replace(LABEL_LAWYER, '');
      const name = clearName(resto);
      const oab = oabSchema.safeParse(resto.match(OAB)?.[1] ?? '');
      if (name) add({ side, type: 'lawyer', name, oab: oab.success ? oab.data : undefined, ...contacts(resto) });
    }
  }
  return parties;
};

// The full process repeats a header in every document, each with small differences: the parties are
// the ones of the last header with both sides (the latest order) or, without it, the first one (the
// initial petition) (RSV-02). A header ends after a few rows without a label.
const HEADER_GAP = 3;
const extractParties = (rows: string[]): CasePartyInput[] => {
  const blocks: string[][] = [];
  let gap = HEADER_GAP;
  for (const row of rows) {
    const labeled = LABEL_SIDE.some(([regex]) => regex.test(row)) || LABEL_LAWYER.test(row);
    if (!labeled) {
      gap++;
      continue;
    }
    if (gap >= HEADER_GAP) blocks.push([]);
    blocks.at(-1)?.push(row);
    gap = 0;
  }
  const headers = blocks.map(partiesOfBlock).filter((parties) => parties.length);
  const complete = headers.filter((parties) => new Set(parties.map((party) => party.side)).size === 2);
  return complete.at(-1) ?? headers[0] ?? [];
};

const extractDivision = (rows: string[], text: string): Pick<PdfDraft, 'division' | 'district'> => {
  const labeledDistrict = text.match(/\b(?:Comarca|Foro)\s+(?:de|da|do)\s+([A-ZÀ-Ú][^\n,–-]*)/)?.[1]?.trim();
  const row = rows.find((l) => /\bVara\b/i.test(l) && l.length <= 120);
  if (!row) return { district: labeledDistrict };
  // "1ª Vara do Trabalho de São Paulo" → division "1ª Vara do Trabalho", district "São Paulo".
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

// Date of the last nomination of an expert in the text (RSV-02): a case may be renominated. Only
// sentences that name an expert count, so "designo audiência" does not.
const extractNomination = (text: string): string | undefined => {
  const sentences = (text.match(/[^.]*\b(nomei|nomead|nomea[çc][ãa]o|design)[^.]*/gi) ?? []).filter((frase) =>
    /perit/i.test(frase),
  );
  const dates = sentences.flatMap((frase) => [
    ...[...frase.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}/g)].map(([date]) => parseData(date)),
    ...[...frase.matchAll(/(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/gi)].map(([, day, name, year]) => {
      const month = MONTHS.indexOf((name ?? '').toLowerCase()) + 1;
      return month ? parseData(`${day}/${month}/${year}`) : undefined;
    }),
  ]);
  return dates
    .filter((date) => date !== undefined)
    .sort()
    .at(-1);
};

// Pure function: minutes/order text → registration draft + what was missing + warnings.
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
  const parties = extractParties(rows);

  const draft: PdfDraft = {
    role: 'court_expert',
    processNumber,
    ...(processNumber ? courtUnitFromNumber(processNumber) : {}),
    ...extractDivision(rows, text),
    subject: extractSubject(text),
    ...(parties.length ? { parties } : {}),
    nominationDate,
  };
  const esperados = ['processNumber', 'court', 'division', 'district', 'subject', 'parties', 'nominationDate'] as const;
  const clean = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined)) as PdfDraft;
  return { draft: clean, missing: esperados.filter((field) => !clean[field]), warnings };
};

// Text of a PDF with selectable text (AD-114); also read by the report from the full process (AD-152).
const pdfText = async (file: Uint8Array): Promise<string> => {
  if (Buffer.from(file.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new CustomError('unsupported_file_type', 415);
  }
  try {
    return (await extractText(file, { mergePages: true })).text;
  } catch (error) {
    throw new CustomError('unsupported_file_type', 415, error instanceof Error ? error.message : undefined);
  }
};

// Text of the PDF; a PDF without selectable text is refused.
export const extractPdfText = async (file: Buffer): Promise<string> => {
  if (!Buffer.isBuffer(file)) throw new CustomError('unsupported_file_type', 415);
  const text = await pdfText(new Uint8Array(file));
  if (!text.trim()) throw new CustomError('pdf_without_text', 422);
  return text;
};

export const extractPdf = async (tenantId: string, file: Buffer): Promise<PdfExtraction> => {
  const extraction = extractMinutes(await extractPdfText(file));
  const number = extraction.draft.processNumber;
  const existingId = number ? await caseRepository.findIdByNumber(tenantId, number) : undefined;
  if (!existingId) return extraction;
  return { ...extraction, existingId, warnings: [...extraction.warnings, 'expert_case_already_registered'] };
};

// --- CSV (AD-115, RSV-04) ---------------------------------------------------------
// Separator `;`, `,` or tab (the most frequent in the first line), double quotes for a field with the
// separator/line break, BOM ignored.
export const parseCsv = (text: string): string[][] => {
  const font = text.replace(/^﻿/, '');
  const firstLine = font.split(/\r?\n/, 1)[0] ?? '';
  const separator = [';', ',', '\t'].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best,
  );
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let aspas = false;
  for (let i = 0; i < font.length; i++) {
    const c = font[i];
    if (aspas) {
      if (c === '"' && font[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') aspas = false;
      else field += c;
    } else if (c === '"') aspas = true;
    else if (c === separator) {
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

const parseCentavos = (raw: string): number | undefined => {
  const limpo = raw.replace(/R\$|\s/g, '');
  const number = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : undefined;
};

// Dates as spreadsheets write them: 15/10/2026, 15-10-2026, 15.10.2026 or 2026-10-15 (with a time).
const parseCsvDate = (raw: string): string | undefined =>
  parseData(
    raw
      .trim()
      .replace(/^(\d{1,2})[.-](\d{1,2})[.-](\d{4})$/, '$1/$2/$3')
      .replace(/^(\d{4}-\d{2}-\d{2})[T ].*$/, '$1'),
  );

// 20 digits without the mask become the CNJ number.
const parseProcessNumber = (raw: string): string | undefined => {
  const digits = raw.replace(/\D/g, '');
  const value =
    digits.length === 20 ? digits.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6') : raw;
  return processNumberSchema.safeParse(value).success ? value.trim() : undefined;
};

// Longest name contained in the text: "laudo entregue" wins over "entregue".
const longestMatch = <T>(text: string, names: [string, T][]): T | undefined => {
  const key = ` ${csvHeaderKey(text)} `;
  return names
    .filter(([name]) => key.includes(` ${name} `))
    .sort(([a], [b]) => b.length - a.length)
    .at(0)?.[1];
};

// Phase and status (AD-178) read from the spreadsheet text.
type PhaseAndStatus = { phase?: CasePhase; status?: CaseStatus };
const PHASE_NAMES: [string, PhaseAndStatus][] = [
  ['nomeacao aceita', { phase: 'nomination_accepted' }],
  ['proposta de honorarios', { phase: 'fee_proposal' }],
  ['solicitacao de documentos', { phase: 'document_request' }],
  ['documentos pendentes', { phase: 'pending_documents' }],
  ['nomeado', { phase: 'awaiting_scheduling' }],
  ['nomeada', { phase: 'awaiting_scheduling' }],
  ['aguardando agendamento', { phase: 'awaiting_scheduling' }],
  ['checklist', { phase: 'awaiting_scheduling' }],
  ['agendada', { phase: 'awaiting_inspection' }],
  ['agendado', { phase: 'awaiting_inspection' }],
  ['aguardando pericia', { phase: 'awaiting_inspection' }],
  ['pericia agendada', { phase: 'inspection_scheduled' }],
  ['pericia realizada', { phase: 'inspection_done' }],
  ['em laudo', { phase: 'drafting_report' }],
  ['elaborando laudo', { phase: 'drafting_report' }],
  ['laudo em elaboracao', { phase: 'drafting_report' }],
  ['aguardando laudo', { phase: 'drafting_report' }],
  ['revisar laudo', { phase: 'reviewing_report' }],
  ['laudo em revisao', { phase: 'reviewing_report' }],
  ['entregue', { phase: 'report_delivered' }],
  ['laudo entregue', { phase: 'report_delivered' }],
  ['impugnacao', { phase: 'objection_reply_1' }],
  ['esclarecimentos', { phase: 'awaiting_new_clarifications' }],
  ['resposta do juiz', { phase: 'awaiting_judge' }],
  ['aguardando pagamento', { phase: 'evidence_closed' }],
  ['a receber', { phase: 'evidence_closed' }],
  ['monitorar honorarios', { phase: 'evidence_closed' }],
  ['honorarios recebidos', { phase: 'fees_received' }],
  ['concluido', { phase: 'fees_received' }],
  ['concluida', { phase: 'fees_received' }],
  ['finalizado', { phase: 'fees_received' }],
  ['encerrado', { phase: 'fees_received' }],
  ['pago', { phase: 'fees_received' }],
  ['acordo', { phase: 'settlement' }],
  // Technical assistance (AD-186).
  ['proposta enviada', { phase: 'assistance_fee_proposal' }],
  ['contratado', { phase: 'assistance_hired' }],
  ['contratada', { phase: 'assistance_hired' }],
  ['estudo dos autos', { phase: 'case_file_study' }],
  ['reuniao de alinhamento', { phase: 'alignment_meeting' }],
  ['pericia in loco', { phase: 'on_site_inspection' }],
  ['parecer em elaboracao', { phase: 'technical_opinion_drafting' }],
  ['parecer tecnico em elaboracao', { phase: 'technical_opinion_drafting' }],
  ['parecer entregue', { phase: 'technical_opinion_delivered' }],
  ['parecer tecnico entregue', { phase: 'technical_opinion_delivered' }],
  ['quesitos suplementares', { phase: 'supplementary_questions' }],
  ['impugnacao de laudo', { phase: 'report_objection' }],
  ['quesitos complementares', { phase: 'complementary_questions' }],
  ['pericia complementar', { phase: 'complementary_inspection' }],
  ['etapa extra', { phase: 'extra_stage' }],
  ['assistencia finalizada', { phase: 'assistance_finished' }],
  ['desistencia', { phase: 'withdrawal' }],
  ['destituicao', { phase: 'removal' }],
  ['destituido', { phase: 'removal' }],
  ['manifestacao', { phase: 'petition' }],
  ['peticao', { phase: 'petition' }],
  ['ativo', { status: 'active' }],
  ['suspenso', { status: 'suspended' }],
  ['suspensa', { status: 'suspended' }],
  ['recusado', { status: 'canceled' }],
  ['recusada', { status: 'canceled' }],
  ['cancelado', { status: 'canceled' }],
  ['cancelada', { status: 'canceled' }],
];

// "Perícia trabalhista", "Assistência técnica"…; any other name is a service type of the office (AD-158).
const serviceTypeFromText = (text: string): { courtType?: CourtType; role?: CaseRole; serviceType?: string } => {
  const key = csvHeaderKey(text);
  const role = /assist/.test(key) ? 'technical_assistant' : /perit|pericia/.test(key) ? 'court_expert' : undefined;
  const courtType = /trabalh/.test(key)
    ? 'labor'
    : /civel|civil/.test(key)
      ? 'civil'
      : /federal/.test(key)
        ? 'federal'
        : undefined;
  if (courtType) return { courtType, role };
  return role && /^(pericia|pericia judicial|perito|assistencia tecnica|assistente tecnico)$/.test(key)
    ? { role }
    : { serviceType: text.trim() };
};

const TEXT_FIELDS = ['court', 'division', 'district', 'subject', 'claimantJob', 'location'] as const;
const DATE_FIELDS = ['nominationDate', 'reportDeadline', 'docketingDate', 'hireDate', 'terminationDate'] as const;
const NOTES_HEADER = /^(obs|observ|anota|coment)/;

export type CsvCell = { header: string; field: CsvImportField; value: string };
type DeclinedRow = { column?: string; reason: ApiMessageKey };

// One spreadsheet row → registration validated by the same schema as the form, or the rejection reason.
// A value that cannot be read stays blank and goes to the notes with "(!)"; a column without a field goes
// to the notes as "Column: value" (RSV-04).
export const rowToCase = (cells: CsvCell[]): { data: CreateCase } | DeclinedRow => {
  const notes: string[] = [];
  const data: Record<string, unknown> = {};
  const header: Partial<Record<string, string>> = {};
  const sides = { plaintiff: {} as Record<string, string>, defendant: {} as Record<string, string> };
  let typed: ReturnType<typeof serviceTypeFromText> = {};
  const doubt = (cell: CsvCell) => notes.push(`${cell.header}: ${cell.value} (!)`);
  let phaseCell: CsvCell | undefined;

  for (const cell of cells) {
    const { field, value } = cell;
    if (!value || field === 'ignore') continue;
    if (field === 'notes') {
      notes.push(NOTES_HEADER.test(csvHeaderKey(cell.header)) ? value : `${cell.header}: ${value}`);
      continue;
    }
    header[field] ??= cell.header;
    const side = field.startsWith('plaintiff') ? 'plaintiff' : field.startsWith('defendant') ? 'defendant' : undefined;
    if (side) {
      sides[side][field.slice(side.length) || 'name'] = value;
    } else if (field === 'processNumber') {
      const number = parseProcessNumber(value);
      if (number) data.processNumber = number;
      else doubt(cell);
    } else if (field === 'serviceType') {
      typed = serviceTypeFromText(value);
    } else if (field === 'role') {
      const key = csvHeaderKey(value);
      if (/assist/.test(key)) data.role = 'technical_assistant';
      else if (/perit/.test(key)) data.role = 'court_expert';
      else doubt(cell);
    } else if (field === 'status') {
      const found = longestMatch(value, PHASE_NAMES);
      if (found) Object.assign(data, found);
      if (found?.phase) phaseCell = cell;
      else doubt(cell);
    } else if (field === 'proposedFees') {
      const cents = parseCentavos(value);
      if (cents === undefined) doubt(cell);
      else data.proposedFeesCents = cents;
    } else if ((DATE_FIELDS as readonly string[]).includes(field)) {
      const day = parseCsvDate(value);
      if (day) data[field] = day;
      else doubt(cell);
    } else if ((TEXT_FIELDS as readonly string[]).includes(field)) {
      const parsed = createCaseFieldsSchema.shape[field as (typeof TEXT_FIELDS)[number]].safeParse(value);
      if (parsed.success) data[field] = parsed.data;
      else doubt(cell);
    }
  }

  if (typed.serviceType) data.serviceType = typed.serviceType;
  data.role ??= typed.role ?? 'court_expert';
  // A phase of the other list (perícia × assistance, AD-186) stays blank and goes to the notes.
  if (phaseCell && !isOwnType(data) && !casePhases(data.role as CaseRole).includes(data.phase as CasePhase)) {
    delete data.phase;
    doubt(phaseCell);
  }
  const unit = typeof data.processNumber === 'string' ? courtUnitFromNumber(data.processNumber) : undefined;
  // Only a perícia has a sphere and needs the process (AD-178).
  if (!usesContractor(data)) {
    const courtType = typed.courtType ?? unit?.courtType;
    if (!courtType) {
      const reason = data.processNumber
        ? 'unsupported_court'
        : header.processNumber
          ? 'invalid_process_number'
          : 'csv_missing_process_number';
      return { column: header.processNumber, reason };
    }
    data.courtType = courtType;
  }
  data.court ??= unit?.court;
  // Without an object column, the service type names the service.
  data.subject ??= typed.serviceType;
  if (!data.subject) return { reason: 'csv_missing_subject' };

  const parties: CasePartyInput[] = [];
  for (const side of ['plaintiff', 'defendant'] as const) {
    const { name, Document, Lawyer, LawyerOab } = sides[side];
    const document = documentSchema.safeParse(Document ?? '');
    const oab = oabSchema.safeParse(LawyerOab ?? '');
    if (Document && !document.success) notes.push(`${header[`${side}Document`]}: ${Document} (!)`);
    if (LawyerOab && !oab.success) notes.push(`${header[`${side}LawyerOab`]}: ${LawyerOab} (!)`);
    if (name) parties.push({ side, type: 'party', name, document: document.success ? document.data : undefined });
    if (Lawyer) parties.push({ side, type: 'lawyer', name: Lawyer, oab: oab.success ? oab.data : undefined });
  }
  if (parties.length) data.parties = parties;
  if (notes.length) data.notes = notes.join('\n').slice(0, 2000);

  const parsed = createCaseSchema.safeParse(data);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '');
    return { column: header[field === 'proposedFeesCents' ? 'proposedFees' : field], reason: 'invalid_field' };
  }
  return { data: parsed.data };
};

const readCsv = (text: unknown): { header: string[]; rows: { fields: string[]; line: number }[] } => {
  const [header, ...records] = parseCsv(typeof text === 'string' ? text : '');
  const rows = records
    .map((fields, index) => ({ fields, line: index + 2 }))
    .filter(({ fields }) => fields.some((field) => field.trim()));
  if (!header || !rows.length) throw new CustomError('csv_empty', 400);
  if (rows.length > CSV_IMPORT_MAX_ROWS) throw new CustomError('csv_too_many_rows', 400);
  return { header: header.map((name) => name.trim()), rows };
};

// Columns of the spreadsheet with the suggested field and a sample value, for the expert to check (RSV-04).
export const csvColumns = (text: unknown): CsvColumn[] => {
  const { header, rows } = readCsv(text);
  return header.map((name, i) => ({
    header: name,
    sample: rows.map(({ fields }) => (fields[i] ?? '').trim()).find(Boolean),
    ...suggestCsvField(name),
  }));
};

// Imports the valid rows one by one through the same path as the form and returns the report per row
// (row 1 is the header). `fields` is the field of each column, as checked by the expert; without it, the
// suggestion. A number already registered is skipped without stopping the batch.
export const importCsv = async (
  tenantId: string,
  text: unknown,
  fields?: CsvImportField[],
): Promise<CsvImportResult> => {
  const { header, rows } = readCsv(text);
  const columns = fields ?? header.map((name) => suggestCsvField(name).field);
  if (columns.length !== header.length) throw new CustomError('csv_invalid_header', 400);

  const result: CsvImportResult = { created: 0, skipped: [], rejected: [] };
  for (const { fields: values, line } of rows) {
    const row = rowToCase(
      header.map((name, i) => ({ header: name, field: columns[i] ?? 'ignore', value: (values[i] ?? '').trim() })),
    );
    if (!('data' in row)) {
      result.rejected.push({ line, ...row });
      continue;
    }
    try {
      await caseService.createCase({ ...row.data, tenant: tenantId });
      result.created++;
    } catch (error) {
      if (error instanceof CustomError && error.message === 'expert_case_already_registered') {
        result.skipped.push({ line, processNumber: row.data.processNumber ?? '' });
      } else if (error instanceof CustomError && error.status < 500) {
        result.rejected.push({ line, reason: error.message });
      } else {
        throw error;
      }
    }
  }
  return result;
};
