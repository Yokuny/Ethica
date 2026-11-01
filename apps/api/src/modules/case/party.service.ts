import { TextSearchUnavailableError } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as caseRepository from './case.repository.js';
import * as partyRepository from './party.repository.js';
import type {
  CasePartyInput,
  CasePartyWrite,
  CreateParty,
  ListPartiesQuery,
  PartyRecord,
  UpdateParty,
} from './party.schema.js';

export class PartyNotFoundError extends KeyedError {}

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export const createParty = (tenantId: string, data: CreateParty): Promise<PartyRecord> =>
  partyRepository.createParty(tenantId, { ...data, name: normalizeName(data.name) });

export const getParty = async (tenantId: string, id: string): Promise<PartyRecord> => {
  const party = await partyRepository.findById(tenantId, id);
  if (!party) throw new PartyNotFoundError('not_found');
  return party;
};

// Renaming updates the name copy kept on the cases (AD-117).
export const updateParty = async (tenantId: string, id: string, data: UpdateParty): Promise<PartyRecord> => {
  const before = await getParty(tenantId, id);
  const name = data.name ? normalizeName(data.name) : undefined;
  const updated = await partyRepository.updateParty(tenantId, id, { ...data, name });
  if (!updated) throw new PartyNotFoundError('not_found');
  if (name && name !== before.name) await caseRepository.renameParty(tenantId, id, name);
  return updated;
};

export const listParties = async (tenantId: string, query: ListPartiesQuery) => {
  try {
    return await partyRepository.listParties(tenantId, query);
  } catch (error) {
    if (error instanceof TextSearchUnavailableError) throw new CustomError('search_unavailable', 503);
    throw error;
  }
};

export const listPartyCases = async (tenantId: string, id: string) => {
  await getParty(tenantId, id);
  return caseRepository.listByParty(tenantId, id);
};

// With `partyId`, uses the chosen record. Without it (AD-115): a party with CPF/CNPJ and a lawyer
// with OAB are looked up only by the document; without a document, by exact name and type; otherwise it creates one.
const resolveParty = async (tenantId: string, input: CasePartyInput): Promise<PartyRecord> => {
  if (input.partyId) {
    const party = await partyRepository.findById(tenantId, input.partyId);
    if (!party) throw new CustomError('party_not_found', 400, input.partyId);
    return party;
  }
  const name = normalizeName(input.name);
  const document = input.type === 'party' ? input.document : undefined;
  const oab = input.type === 'lawyer' ? input.oab : undefined;
  const existing = await partyRepository.findOneBy(
    tenantId,
    document ? { type: input.type, document } : oab ? { type: input.type, oab } : { type: input.type, name },
  );
  return existing ?? partyRepository.createParty(tenantId, { type: input.type, name, document, oab });
};

// In sequence: the same party repeated in the list (or in the batch) resolves to a single record.
export const resolveParties = async (tenantId: string, inputs: CasePartyInput[]): Promise<CasePartyWrite[]> => {
  const result: CasePartyWrite[] = [];
  for (const input of inputs) {
    const party = await resolveParty(tenantId, input);
    if (result.some((item) => item.partyId === party.id && item.side === input.side)) continue;
    result.push({
      partyId: party.id,
      side: input.side,
      type: party.type,
      name: party.name,
      ...(input.client ? { client: true } : {}),
    });
  }
  return result;
};

// Schedule notice recipients (AD-131): parties and lawyers in a single batch.
export const findByIds = (tenantId: string, ids: string[]) => partyRepository.findByIds(tenantId, ids);

export const listForExport = (tenantId: string) => partyRepository.listAll(tenantId);
