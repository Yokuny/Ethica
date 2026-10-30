import { TextSearchUnavailableError } from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaRepository from './pericia.repository.js';
import type { CreatePericiaInput, ListPericiasQuery, PericiaRecord, UpdatePericia } from './pericia.schema.js';

// AD-010: findById/update/delete já são tenant-scoped — um id de outro tenant
// simplesmente não existe para esta sessão.
export class PericiaNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

export const createPericia = async (input: CreatePericiaInput): Promise<PericiaRecord> => {
  try {
    const pericia = await periciaRepository.createPericia(input);
    // Agenda (prazo do laudo) e financeiro reagem por evento; a resposta não espera por eles.
    domainEventBus.emit('pericia:created', {
      tenantId: input.tenant,
      periciaId: pericia.id,
      numeroProcesso: pericia.numeroProcesso,
      prazoLaudo: pericia.prazoLaudo,
    });
    return pericia;
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new CustomError('pericia_already_registered', 409);
    throw e;
  }
};

export const getPericia = async (tenantId: string, id: string): Promise<PericiaRecord> => {
  const pericia = await periciaRepository.findById(tenantId, id);
  if (!pericia) throw new PericiaNotFoundError('not_found');
  return pericia;
};

export const updatePericia = async (tenantId: string, id: string, data: UpdatePericia): Promise<PericiaRecord> => {
  const before = await getPericia(tenantId, id);
  const updated = await periciaRepository.updatePericia(tenantId, id, data);
  if (!updated) throw new PericiaNotFoundError('not_found');
  // Honorário fixado pelo juízo (novo ou alterado) vira receita a receber no financeiro.
  if (updated.honorariosFixadosCents && updated.honorariosFixadosCents !== before.honorariosFixadosCents) {
    domainEventBus.emit('pericia:honorarios_fixados', {
      tenantId,
      periciaId: updated.id,
      numeroProcesso: updated.numeroProcesso,
      valorCents: updated.honorariosFixadosCents,
    });
  }
  return updated;
};

// Excluir é ação de admin (pericia.router.ts). Compromissos e lançamentos que
// apontam para ela ficam sem o vínculo: referência ausente vira campo ausente.
export const deletePericia = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await periciaRepository.deletePericia(tenantId, id);
  if (deletedCount === 0) throw new PericiaNotFoundError('not_found');
};

export const listPericias = async (tenantId: string, query: ListPericiasQuery) => {
  try {
    return await periciaRepository.listPericias(tenantId, query);
  } catch (error) {
    // Banco sem Atlas Search: erro explícito, nunca regex em silêncio (AD-054).
    if (error instanceof TextSearchUnavailableError) throw new CustomError('search_unavailable', 503);
    throw error;
  }
};

export const periciaStats = (tenantId: string) => periciaRepository.stats(tenantId);
export const periciaDistribution = (tenantId: string) => periciaRepository.distribution(tenantId);
export const findNumerosByIds = (tenantId: string, ids: string[]) => periciaRepository.findNumerosByIds(tenantId, ids);
