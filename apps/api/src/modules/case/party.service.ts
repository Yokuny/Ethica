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

const normalizarNome = (nome: string): string => nome.trim().replace(/\s+/g, ' ');

export const createParty = (tenantId: string, data: CreateParty): Promise<PartyRecord> =>
  partyRepository.createParty(tenantId, { ...data, nome: normalizarNome(data.nome) });

export const getParty = async (tenantId: string, id: string): Promise<PartyRecord> => {
  const party = await partyRepository.findById(tenantId, id);
  if (!party) throw new PartyNotFoundError('not_found');
  return party;
};

// Renomear atualiza a cópia do nome guardada nas perícias (AD-117).
export const updateParty = async (tenantId: string, id: string, data: UpdateParty): Promise<PartyRecord> => {
  const before = await getParty(tenantId, id);
  const nome = data.nome ? normalizarNome(data.nome) : undefined;
  const updated = await partyRepository.updateParty(tenantId, id, { ...data, nome });
  if (!updated) throw new PartyNotFoundError('not_found');
  if (nome && nome !== before.nome) await caseRepository.renameParty(tenantId, id, nome);
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

// Com `parteId`, usa o cadastro escolhido. Sem ele (AD-115): parte com CPF/CNPJ e advogado
// com OAB são procurados só pelo documento; sem documento, pelo nome exato e tipo; senão cria.
const resolveParty = async (tenantId: string, input: CasePartyInput): Promise<PartyRecord> => {
  if (input.partyId) {
    const party = await partyRepository.findById(tenantId, input.partyId);
    if (!party) throw new CustomError('party_not_found', 400, input.partyId);
    return party;
  }
  const nome = normalizarNome(input.nome);
  const document = input.tipo === 'party' ? input.document : undefined;
  const oab = input.tipo === 'lawyer' ? input.oab : undefined;
  const existing = await partyRepository.findOneBy(
    tenantId,
    document ? { tipo: input.tipo, document } : oab ? { tipo: input.tipo, oab } : { tipo: input.tipo, nome },
  );
  return existing ?? partyRepository.createParty(tenantId, { tipo: input.tipo, nome, document, oab });
};

// Em sequência: a mesma parte repetida na lista (ou no lote) resolve para um só cadastro.
export const resolveParties = async (tenantId: string, inputs: CasePartyInput[]): Promise<CasePartyWrite[]> => {
  const result: CasePartyWrite[] = [];
  for (const input of inputs) {
    const party = await resolveParty(tenantId, input);
    if (result.some((item) => item.partyId === party.id && item.side === input.side)) continue;
    result.push({
      partyId: party.id,
      side: input.side,
      tipo: party.tipo,
      nome: party.nome,
      ...(input.client ? { client: true } : {}),
    });
  }
  return result;
};

// Destinatários do aviso de agendamento (AD-131): partes e advogados num só lote.
export const findByIds = (tenantId: string, ids: string[]) => partyRepository.findByIds(tenantId, ids);

export const listForExport = (tenantId: string) => partyRepository.listAll(tenantId);
