import { dateInDisplayTz } from '@ethica/db';
import { KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaService from './pericia.service.js';
import * as prazoRepository from './prazo.repository.js';
import type { CreatePrazo, PrazoRecord, PrazoWrite, UpdatePrazo } from './prazo.schema.js';

export class PrazoNotFoundError extends KeyedError {}

const withPericiaNumero = async <T extends PrazoRecord>(tenantId: string, items: T[]): Promise<T[]> => {
  const ids = [...new Set(items.map((item) => item.periciaId))];
  const resumos = await periciaService.findResumosByIds(tenantId, ids);
  return items.map((item) => {
    const numero = resumos.get(item.periciaId)?.numeroProcesso;
    return numero ? { ...item, periciaNumero: numero } : item;
  });
};

// Protocolar sem data grava hoje; voltar a pendente ou marcar perdido apaga a data.
// `protocoladoEm` sem `status` não muda nada: a data só existe junto do protocolo.
const toWrite = ({ status, protocoladoEm, ...rest }: UpdatePrazo, today: string): PrazoWrite => {
  if (!status) return rest;
  return { ...rest, status, protocoladoEm: status === 'filed' ? (protocoladoEm ?? today) : null };
};

// Perícia inexistente (ou de outro tenant) → PericiaNotFoundError, o mesmo 404 da perícia.
export const createPrazo = async (tenantId: string, periciaId: string, data: CreatePrazo): Promise<PrazoRecord> => {
  await periciaService.getPericia(tenantId, periciaId);
  return prazoRepository.createPrazo(tenantId, periciaId, data);
};

export const listPrazosDaPericia = async (tenantId: string, periciaId: string): Promise<PrazoRecord[]> => {
  await periciaService.getPericia(tenantId, periciaId);
  return prazoRepository.listByPericia(tenantId, periciaId);
};

export const updatePrazo = async (
  tenantId: string,
  id: string,
  data: UpdatePrazo,
  now: Date = new Date(),
): Promise<PrazoRecord> => {
  const updated = await prazoRepository.updatePrazo(tenantId, id, toWrite(data, dateInDisplayTz(now)));
  if (!updated) throw new PrazoNotFoundError('not_found');
  return updated;
};

export const deletePrazo = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await prazoRepository.deletePrazo(tenantId, id);
  if (deletedCount === 0) throw new PrazoNotFoundError('not_found');
};

export const listPrazosPendentes = async (tenantId: string, range: { from?: string; to?: string } = {}) =>
  withPericiaNumero(tenantId, await prazoRepository.listPendentes(tenantId, range));

// Aviso diário (sistema): pendentes que vencem nos dias pedidos, em todos os tenants.
export const listPrazosParaAviso = (dias: string[]) => prazoRepository.listPendentesNosDias(dias);

export const listForExport = (tenantId: string) => prazoRepository.listAll(tenantId);
