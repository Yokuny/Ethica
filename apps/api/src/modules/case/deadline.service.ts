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
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const number = summaries.get(item.caseId)?.processNumber;
    return number ? { ...item, caseNumber: number } : item;
  });
};

// Filing without a date saves today; going back to pending or marking missed clears the date.
// `filedDate` without `status` changes nothing: the date only exists with the filing.
const toWrite = ({ status, filedDate, ...rest }: UpdateDeadline, today: string): DeadlineWrite => {
  if (!status) return rest;
  return { ...rest, status, filedDate: status === 'filed' ? (filedDate ?? today) : null };
};

// Missing case (or from another tenant) → CaseNotFoundError, the same 404 as the case.
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

// Daily reminder (system): pending ones due on the requested days, across all tenants.
export const listDeadlinesToNotice = (days: string[]) => deadlineRepository.listPendingInDays(days);

// Completing the report with delivery (AD-126): files today the oldest pending "Entrega do laudo"
// deadline of the case; with none pending, does nothing.
export const fileReportDelivery = (tenantId: string, caseId: string, now: Date = new Date()) =>
  deadlineRepository.filePending(tenantId, caseId, REPORT_DELIVERY_DEADLINE, dateInDisplayTz(now));

export const listForExport = (tenantId: string) => deadlineRepository.listAll(tenantId);
