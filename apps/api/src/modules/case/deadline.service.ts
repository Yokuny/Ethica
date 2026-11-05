import { caseLabel, deadlineAgendaEntries, validDeadlineStatus } from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as caseService from './case.service.js';
import * as deadlineRepository from './deadline.repository.js';
import {
  type CreateDeadline,
  type DeadlineRecord,
  type DeadlineWrite,
  type ListDeadlinesQuery,
  REPORT_DELIVERY_DEADLINE,
  type UpdateDeadline,
} from './deadline.schema.js';

export class DeadlineNotFoundError extends KeyedError {}

const withCase = async <T extends DeadlineRecord>(tenantId: string, items: T[]): Promise<T[]> => {
  const ids = [...new Set(items.map((item) => item.caseId))];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const summary = summaries.get(item.caseId);
    if (!summary) return item;
    const { client, plaintiff, defendant, role, serviceType, courtType } = summary;
    return { ...item, caseNumber: caseLabel(summary), client, plaintiff, defendant, role, serviceType, courtType };
  });
};

// Filing without a date saves today; going back to pending or marking missed clears the date.
// `filedDate` without `status` changes nothing: the date only exists with the filing.
const toWrite = ({ status, filedDate, ...rest }: UpdateDeadline, today: string): DeadlineWrite => {
  if (!status) return rest;
  return { ...rest, status, filedDate: status === 'filed' ? (filedDate ?? today) : null };
};

// Agenda by events (AD-169): the deadline's entry on every change; none once it is deleted.
const syncAgenda = (tenantId: string, id: string, deadline?: DeadlineRecord): void => {
  domainEventBus.emit('agenda:entries_synced', {
    tenantId,
    source: 'deadline',
    originId: id,
    caseId: deadline?.caseId,
    entries: deadline ? deadlineAgendaEntries(deadline) : [],
  });
};

// Missing case (or from another tenant) → CaseNotFoundError, the same 404 as the case.
export const createDeadline = async (
  tenantId: string,
  caseId: string,
  data: CreateDeadline,
): Promise<DeadlineRecord> => {
  await caseService.getCase(tenantId, caseId);
  const deadline = await deadlineRepository.createDeadline(tenantId, caseId, data);
  syncAgenda(tenantId, deadline.id, deadline);
  return deadline;
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
  // A deadline is filed or missed, an alert is concluded (AD-189).
  if (data.status) {
    const before = await deadlineRepository.findById(tenantId, id);
    if (!before) throw new DeadlineNotFoundError('not_found');
    if (!validDeadlineStatus(before.kind, data.status)) throw new CustomError('invalid_deadline_status', 422);
  }
  const updated = await deadlineRepository.updateDeadline(tenantId, id, toWrite(data, dateInDisplayTz(now)));
  if (!updated) throw new DeadlineNotFoundError('not_found');
  syncAgenda(tenantId, id, updated);
  return updated;
};

export const deleteDeadline = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await deadlineRepository.deleteDeadline(tenantId, id);
  if (deletedCount === 0) throw new DeadlineNotFoundError('not_found');
  syncAgenda(tenantId, id);
};

export const listDeadlines = async (tenantId: string, query: ListDeadlinesQuery) => {
  const result = await deadlineRepository.listDeadlines(tenantId, query);
  return { ...result, items: await withCase(tenantId, result.items) };
};

export const listPendingDeadlines = async (tenantId: string, range: { from?: string; to?: string } = {}) =>
  withCase(tenantId, await deadlineRepository.listPending(tenantId, range));

// Daily reminder (system): pending ones due on the requested days, across all tenants.
export const listDeadlinesToNotice = (days: string[]) => deadlineRepository.listPendingInDays(days);

// Completing the report with delivery (AD-126): files today the oldest pending "Entrega do laudo"
// deadline of the case; with none pending, does nothing.
export const fileReportDelivery = async (tenantId: string, caseId: string, now: Date = new Date()) => {
  const filed = await deadlineRepository.filePending(tenantId, caseId, REPORT_DELIVERY_DEADLINE, dateInDisplayTz(now));
  if (filed) syncAgenda(tenantId, filed.id, filed);
  return filed;
};

export const listForExport = (tenantId: string) => deadlineRepository.listAll(tenantId);
