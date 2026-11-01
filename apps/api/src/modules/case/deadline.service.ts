import { dateInDisplayTz } from '@ethica/db';
import { KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as caseService from './case.service.js';
import * as deadlineRepository from './deadline.repository.js';
import {
  type CreateDeadline,
  type DeadlineRecord,
  type DeadlineWrite,
  REPORT_DELIVERY_DEADLINE,
  type UpdateDeadline,
} from './deadline.schema.js';

export class DeadlineNotFoundError extends KeyedError {}

const withCaseNumber = async <T extends DeadlineRecord>(tenantId: string, items: T[]): Promise<T[]> => {
  const ids = [...new Set(items.map((item) => item.caseId))];
  const resumos = await caseService.findResumosByIds(tenantId, ids);
  return items.map((item) => {
    const numero = resumos.get(item.caseId)?.processNumber;
    return numero ? { ...item, caseNumber: numero } : item;
  });
};

// Protocolar sem data grava hoje; voltar a pendente ou marcar perdido apaga a data.
// `protocoladoEm` sem `status` não muda nada: a data só existe junto do protocolo.
const toWrite = ({ status, filedDate, ...rest }: UpdateDeadline, today: string): DeadlineWrite => {
  if (!status) return rest;
  return { ...rest, status, filedDate: status === 'filed' ? (filedDate ?? today) : null };
};

// Perícia inexistente (ou de outro tenant) → PericiaNotFoundError, o mesmo 404 da perícia.
export const createDeadline = async (
  tenantId: string,
  caseId: string,
  data: CreateDeadline,
): Promise<DeadlineRecord> => {
  await caseService.getCase(tenantId, caseId);
  return deadlineRepository.createDeadline(tenantId, caseId, data);
};

export const listCaseDeadlines = async (tenantId: string, caseId: string): Promise<DeadlineRecord[]> => {
  await caseService.getCase(tenantId, caseId);
  return deadlineRepository.listByCase(tenantId, caseId);
};

export const updateDeadline = async (
  tenantId: string,
  id: string,
  data: UpdateDeadline,
  now: Date = new Date(),
): Promise<DeadlineRecord> => {
  const updated = await deadlineRepository.updateDeadline(tenantId, id, toWrite(data, dateInDisplayTz(now)));
  if (!updated) throw new DeadlineNotFoundError('not_found');
  return updated;
};

export const deleteDeadline = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await deadlineRepository.deleteDeadline(tenantId, id);
  if (deletedCount === 0) throw new DeadlineNotFoundError('not_found');
};

export const listPendingDeadlines = async (tenantId: string, range: { from?: string; to?: string } = {}) =>
  withCaseNumber(tenantId, await deadlineRepository.listPending(tenantId, range));

// Aviso diário (sistema): pendentes que vencem nos dias pedidos, em todos os tenants.
export const listDeadlinesToNotice = (dias: string[]) => deadlineRepository.listPendingInDays(dias);

// Concluir o laudo com a entrega (AD-126): protocola hoje o prazo pendente "Entrega do laudo"
// mais antigo da perícia; sem nenhum pendente, não faz nada.
export const fileReportDelivery = (tenantId: string, caseId: string, now: Date = new Date()) =>
  deadlineRepository.filePending(tenantId, caseId, REPORT_DELIVERY_DEADLINE, dateInDisplayTz(now));

export const listForExport = (tenantId: string) => deadlineRepository.listAll(tenantId);
