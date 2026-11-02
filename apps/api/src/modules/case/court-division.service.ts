import {
  type ApiMessageKey,
  COURT_DIVISION_CSV_REQUIRED,
  COURT_TYPE_CSV,
  type CourtDivisionCsvColumn,
  CSV_IMPORT_MAX_ROWS,
  createCourtDivisionSchema,
} from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as courtDivisionRepository from './court-division.repository.js';
import type {
  CourtDivisionImportResult,
  CourtDivisionRecord,
  CreateCourtDivision,
  ListCourtDivisionsQuery,
  UpdateCourtDivision,
} from './court-division.schema.js';
import { parseCsv } from './import.service.js';

export class CourtDivisionNotFoundError extends KeyedError {}

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// The same division in the same city (case and accents ignored) is registered once (AD-151).
export const createCourtDivision = async (
  tenantId: string,
  data: CreateCourtDivision,
): Promise<CourtDivisionRecord> => {
  try {
    return await courtDivisionRepository.create(tenantId, data);
  } catch (e) {
    if (isDuplicateKey(e)) throw new CustomError('already_exists', 409);
    throw e;
  }
};

export const listCourtDivisions = (tenantId: string, query: ListCourtDivisionsQuery) =>
  courtDivisionRepository.list(tenantId, query);

export const listCities = (tenantId: string, state: string) => courtDivisionRepository.cities(tenantId, state);

export const updateCourtDivision = async (
  tenantId: string,
  id: string,
  data: UpdateCourtDivision,
): Promise<CourtDivisionRecord> => {
  try {
    const updated = await courtDivisionRepository.update(tenantId, id, data);
    if (!updated) throw new CourtDivisionNotFoundError('not_found');
    return updated;
  } catch (e) {
    if (isDuplicateKey(e)) throw new CustomError('already_exists', 409);
    throw e;
  }
};

export const deleteCourtDivision = async (tenantId: string, id: string): Promise<void> => {
  if (!(await courtDivisionRepository.remove(tenantId, id))) throw new CourtDivisionNotFoundError('not_found');
};

// Spreadsheet column of each field, to say where a rejected row is wrong.
const COLUMN_OF: Record<string, CourtDivisionCsvColumn> = {
  courtType: 'justica',
  name: 'vara',
  court: 'tribunal',
  state: 'uf',
  city: 'cidade',
  address: 'endereco',
  phones: 'telefones',
  email: 'email',
  virtualDesk: 'balcao_virtual',
  notes: 'observacoes',
};

// VAR-02: same rules as the case spreadsheet (AD-118): `;` separator, report by line.
export const importCsv = async (tenantId: string, text: string): Promise<CourtDivisionImportResult> => {
  const [header, ...records] = parseCsv(typeof text === 'string' ? text : '');
  const rows = records
    .map((fields, index) => ({ fields, line: index + 2 }))
    .filter(({ fields }) => fields.some((field) => field.trim()));
  if (!header || !rows.length) throw new CustomError('csv_empty', 400);
  if (rows.length > CSV_IMPORT_MAX_ROWS) throw new CustomError('csv_too_many_rows', 400);
  const columns = header.map((name) => name.trim().toLowerCase());
  const missing = COURT_DIVISION_CSV_REQUIRED.filter((column) => !columns.includes(column));
  if (missing.length) throw new CustomError('csv_invalid_header', 400, missing.join(', '));

  const result: CourtDivisionImportResult = { created: 0, skipped: [], rejected: [] };
  for (const { fields, line } of rows) {
    const get = (column: CourtDivisionCsvColumn) => (fields[columns.indexOf(column)] ?? '').trim();
    const parsed = createCourtDivisionSchema.safeParse({
      courtType: COURT_TYPE_CSV[get('justica').toLowerCase()] ?? get('justica'),
      name: get('vara'),
      court: get('tribunal'),
      state: get('uf').toUpperCase(),
      city: get('cidade'),
      address: get('endereco'),
      phones: get('telefones'),
      email: get('email'),
      virtualDesk: get('balcao_virtual'),
      notes: get('observacoes'),
    });
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? '');
      result.rejected.push({ line, column: COLUMN_OF[field], reason: 'invalid_data' satisfies ApiMessageKey });
      continue;
    }
    try {
      await courtDivisionRepository.create(tenantId, parsed.data);
      result.created++;
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      result.skipped.push({ line, name: parsed.data.name });
    }
  }
  return result;
};
