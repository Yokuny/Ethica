import type { DatajudSearch } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { DatajudClient } from '../../providers/datajudClient.js';
import { DatajudUnavailableError } from '../../providers/datajudClient.js';
import * as caseService from '../case/case.service.js';
import * as opportunityRepository from './opportunity.repository.js';
import type {
  ConvertOpportunity,
  CreateOpportunity,
  DatajudResult,
  ListOpportunitiesQuery,
  OpportunityRecord,
  UpdateOpportunity,
} from './opportunity.schema.js';

export class OpportunityNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Busca de possíveis nomeações no Datajud; cada resultado já salvo leva o id da oportunidade.
export const searchDatajud = async (
  client: DatajudClient | undefined,
  tenantId: string,
  query: DatajudSearch,
): Promise<{ items: DatajudResult[]; cursor?: (string | number)[] }> => {
  if (!client) throw new CustomError('datajud_not_configured', 503);
  try {
    const result = await client.search(query);
    const saved = await opportunityRepository.findIdsByNumeros(
      tenantId,
      result.items.map((item) => item.processNumber),
    );
    return {
      ...result,
      items: result.items.map((item) => {
        const opportunityId = saved.get(item.processNumber);
        return opportunityId ? { ...item, opportunityId } : item;
      }),
    };
  } catch (e) {
    if (e instanceof DatajudUnavailableError) throw new CustomError('datajud_unavailable', 503, e.message);
    throw e;
  }
};

export const createOpportunity = async (tenantId: string, data: CreateOpportunity): Promise<OpportunityRecord> => {
  try {
    return await opportunityRepository.createOpportunity(tenantId, data);
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new CustomError('opportunity_already_saved', 409);
    throw e;
  }
};

const getOpportunity = async (tenantId: string, id: string): Promise<OpportunityRecord> => {
  const opportunity = await opportunityRepository.findById(tenantId, id);
  if (!opportunity) throw new OpportunityNotFoundError('not_found');
  return opportunity;
};

export const updateOpportunity = async (
  tenantId: string,
  id: string,
  data: UpdateOpportunity,
): Promise<OpportunityRecord> => {
  const updated = await opportunityRepository.updateOpportunity(tenantId, id, data);
  if (updated) return updated;
  // Sem atualização: ou não existe, ou já foi convertida.
  await getOpportunity(tenantId, id);
  throw new CustomError('opportunity_already_converted', 409);
};

export const deleteOpportunity = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await opportunityRepository.deleteOpportunity(tenantId, id);
  if (deletedCount === 0) throw new OpportunityNotFoundError('not_found');
};

export const listOpportunities = (tenantId: string, query: ListOpportunitiesQuery) =>
  opportunityRepository.listOpportunities(tenantId, query);
export const opportunityStats = (tenantId: string) => opportunityRepository.stats(tenantId);

// A resposta precisa do id da perícia criada, então a criação é chamada direta
// ao service dono (não evento). Perícia já cadastrada responde 409 e a
// oportunidade continua aberta.
export const convertOpportunity = async (
  tenantId: string,
  id: string,
  data: ConvertOpportunity,
): Promise<{ caseId: string }> => {
  const opportunity = await getOpportunity(tenantId, id);
  if (opportunity.status === 'converted') throw new CustomError('opportunity_already_converted', 409);
  const legalCase = await caseService.createCase({
    ...data,
    tenant: tenantId,
    processNumber: opportunity.processNumber,
    court: opportunity.court.toUpperCase(),
    division: opportunity.courtUnit,
    opportunityId: opportunity.id,
  });
  await opportunityRepository.updateOpportunity(tenantId, id, { status: 'converted', caseId: legalCase.id });
  return { caseId: legalCase.id };
};

export const listForExport = (tenantId: string) => opportunityRepository.listAll(tenantId);
