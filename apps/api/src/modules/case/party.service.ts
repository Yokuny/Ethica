import { partyNameKey } from '@ethica/contracts';
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

const CONTACTS = ['document', 'oab', 'crea', 'email', 'phone'] as const;

// What the input brings that the record does not have yet (PSV-06): fills in, never overwrites.
const missingFields = (party: PartyRecord, input: Partial<Record<(typeof CONTACTS)[number], string>>) =>
  Object.fromEntries(CONTACTS.flatMap((field) => (input[field] && !party[field] ? [[field, input[field]]] : [])));

// With `partyId`, uses the chosen record. Without it (AD-115): a party with CPF/CNPJ, a lawyer with OAB
// and anyone with CREA are looked up by the document; not found, by the name without case or accent
// (PSV-05) and type, as long as that record has no other document; otherwise it creates one. Contacts
// brought by the input complete the record.
const resolveParty = async (tenantId: string, input: CasePartyInput): Promise<PartyRecord> => {
  const name = normalizeName(input.name);
  const document = input.type === 'party' ? input.document : undefined;
  const oab = input.type === 'lawyer' ? input.oab : undefined;
  const fields = { document, oab, crea: input.crea, email: input.email, phone: input.phone };
  const byDocument = document ? { document } : oab ? { oab } : input.crea ? { crea: input.crea } : undefined;
  const sameName = async () => {
    const found = await partyRepository.findOneBy(tenantId, { type: input.type, name });
    const conflict =
      found && CONTACTS.slice(0, 3).some((field) => fields[field] && found[field] && found[field] !== fields[field]);
    return conflict ? null : found;
  };
  const existing = input.partyId
    ? await partyRepository.findById(tenantId, input.partyId)
    : ((byDocument && (await partyRepository.findOneBy(tenantId, { type: input.type, ...byDocument }))) ??
      (await sameName()));
  if (input.partyId && !existing) throw new CustomError('party_not_found', 400, input.partyId);
  if (!existing) return partyRepository.createParty(tenantId, { type: input.type, name, ...fields });
  const missing = missingFields(existing, fields);
  return Object.keys(missing).length
    ? ((await partyRepository.updateParty(tenantId, existing.id, missing)) ?? existing)
    : existing;
};

// PSV-05: records of the same type with the same name (no case or accent difference) become the oldest
// one, with the documents and contacts the others had. Different documents mean different people: kept.
export const mergeDuplicates = async (tenantId: string): Promise<{ merged: number }> => {
  const keepers = new Map<string, PartyRecord>();
  const removed: string[] = [];
  for (const party of await partyRepository.listOldestFirst(tenantId)) {
    const key = `${party.type}:${partyNameKey(party.name)}`;
    const keeper = keepers.get(key);
    const conflict =
      keeper && CONTACTS.slice(0, 3).some((field) => keeper[field] && party[field] && keeper[field] !== party[field]);
    if (!keeper || conflict) {
      if (!keeper) keepers.set(key, party);
      continue;
    }
    const missing = missingFields(keeper, party);
    if (Object.keys(missing).length) {
      keepers.set(key, (await partyRepository.updateParty(tenantId, keeper.id, missing)) ?? keeper);
    }
    await caseRepository.replaceParty(tenantId, party.id, keeper.id, keeper.name);
    removed.push(party.id);
  }
  await partyRepository.deleteMany(tenantId, removed);
  return { merged: removed.length };
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
