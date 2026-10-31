import { TextSearchUnavailableError } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as parteRepository from './parte.repository.js';
import type {
  CreateParte,
  ListPartesQuery,
  ParteRecord,
  PericiaParteInput,
  PericiaParteWrite,
  UpdateParte,
} from './parte.schema.js';
import * as periciaRepository from './pericia.repository.js';

export class ParteNotFoundError extends KeyedError {}

const normalizarNome = (nome: string): string => nome.trim().replace(/\s+/g, ' ');

export const createParte = (tenantId: string, data: CreateParte): Promise<ParteRecord> =>
  parteRepository.createParte(tenantId, { ...data, nome: normalizarNome(data.nome) });

export const getParte = async (tenantId: string, id: string): Promise<ParteRecord> => {
  const parte = await parteRepository.findById(tenantId, id);
  if (!parte) throw new ParteNotFoundError('not_found');
  return parte;
};

// Renomear atualiza a cópia do nome guardada nas perícias (AD-117).
export const updateParte = async (tenantId: string, id: string, data: UpdateParte): Promise<ParteRecord> => {
  const before = await getParte(tenantId, id);
  const nome = data.nome ? normalizarNome(data.nome) : undefined;
  const updated = await parteRepository.updateParte(tenantId, id, { ...data, nome });
  if (!updated) throw new ParteNotFoundError('not_found');
  if (nome && nome !== before.nome) await periciaRepository.renomearParte(tenantId, id, nome);
  return updated;
};

export const listPartes = async (tenantId: string, query: ListPartesQuery) => {
  try {
    return await parteRepository.listPartes(tenantId, query);
  } catch (error) {
    if (error instanceof TextSearchUnavailableError) throw new CustomError('search_unavailable', 503);
    throw error;
  }
};

export const listPericiasDaParte = async (tenantId: string, id: string) => {
  await getParte(tenantId, id);
  return periciaRepository.listByParte(tenantId, id);
};

// Com `parteId`, usa o cadastro escolhido. Sem ele (AD-115): parte com CPF/CNPJ e advogado
// com OAB são procurados só pelo documento; sem documento, pelo nome exato e tipo; senão cria.
const resolveParte = async (tenantId: string, input: PericiaParteInput): Promise<ParteRecord> => {
  if (input.parteId) {
    const parte = await parteRepository.findById(tenantId, input.parteId);
    if (!parte) throw new CustomError('party_not_found', 400, input.parteId);
    return parte;
  }
  const nome = normalizarNome(input.nome);
  const documento = input.tipo === 'party' ? input.documento : undefined;
  const oab = input.tipo === 'lawyer' ? input.oab : undefined;
  const existing = await parteRepository.findOneBy(
    tenantId,
    documento ? { tipo: input.tipo, documento } : oab ? { tipo: input.tipo, oab } : { tipo: input.tipo, nome },
  );
  return existing ?? parteRepository.createParte(tenantId, { tipo: input.tipo, nome, documento, oab });
};

// Em sequência: a mesma parte repetida na lista (ou no lote) resolve para um só cadastro.
export const resolvePartes = async (tenantId: string, inputs: PericiaParteInput[]): Promise<PericiaParteWrite[]> => {
  const result: PericiaParteWrite[] = [];
  for (const input of inputs) {
    const parte = await resolveParte(tenantId, input);
    if (result.some((item) => item.parteId === parte.id && item.polo === input.polo)) continue;
    result.push({ parteId: parte.id, polo: input.polo, tipo: parte.tipo, nome: parte.nome });
  }
  return result;
};

export const listForExport = (tenantId: string) => parteRepository.listAll(tenantId);
