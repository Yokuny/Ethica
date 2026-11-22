import {
  caseLabel,
  hasPermission,
  NOTIFICATION_MODULES,
  type NotificationModule,
  notificationAgendaEntries,
  type Permissions,
  REPORT_DELIVERY_TITLE,
  validNotificationStatus,
} from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as notificationRepository from './notification.repository.js';
import type {
  CreateNotification,
  DatedNotification,
  ListNoticesQuery,
  ListNotificationsQuery,
  NotificationWrite,
  UpdateNotification,
} from './notification.schema.js';

export class NotificationNotFoundError extends KeyedError {}

const withCase = async <T extends DatedNotification>(tenantId: string, items: T[]): Promise<T[]> => {
  const ids = [...new Set(items.map((item) => item.caseId))];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const summary = summaries.get(item.caseId);
    if (!summary) return item;
    const { client, plaintiff, defendant, role, serviceType, courtType } = summary;
    return { ...item, caseNumber: caseLabel(summary), client, plaintiff, defendant, role, serviceType, courtType };
  });
};

// Filing without a date saves today; any other situation clears the date.
// `filedDate` without `status` changes nothing: the date only exists with the filing.
const toWrite = ({ status, filedDate, ...rest }: UpdateNotification, today: string): NotificationWrite => {
  if (!status) return rest;
  return { ...rest, status, filedDate: status === 'filed' ? (filedDate ?? today) : null };
};

// Agenda by events (AD-169, AD-266): the entry of a deadline or alert on every change; none once deleted.
const syncAgenda = (tenantId: string, id: string, notification?: DatedNotification): void => {
  domainEventBus.emit('agenda:entries_synced', {
    tenantId,
    source: 'notification',
    originId: id,
    caseId: notification?.caseId,
    entries: notification ? notificationAgendaEntries(notification) : [],
  });
};

// Missing case (or from another tenant) → CaseNotFoundError, the same 404 as the case.
export const createNotification = async (tenantId: string, data: CreateNotification): Promise<DatedNotification> => {
  await caseService.getCase(tenantId, data.caseId);
  const notification = await notificationRepository.createDated(tenantId, data, 'user');
  syncAgenda(tenantId, notification.id, notification);
  return notification;
};

// The delivery deadline informed at the case registration (`case:created`, AD-264).
export const createDeliveryDue = async (
  tenantId: string,
  caseId: string,
  delivery: { title: string; dueDate: string; notes?: string },
): Promise<DatedNotification> => {
  const notification = await notificationRepository.createDated(
    tenantId,
    { caseId, kind: 'deadline', ...delivery },
    'system',
  );
  syncAgenda(tenantId, notification.id, notification);
  return notification;
};

export const updateNotification = async (
  tenantId: string,
  id: string,
  data: UpdateNotification,
  now: Date = new Date(),
): Promise<DatedNotification> => {
  // A deadline is filed, missed or canceled; an alert is concluded or canceled (AD-189, AD-263).
  if (data.status) {
    const before = await notificationRepository.findDatedById(tenantId, id);
    if (!before) throw new NotificationNotFoundError('not_found');
    if (!validNotificationStatus(before.kind, data.status)) throw new CustomError('invalid_notification_status', 422);
  }
  const updated = await notificationRepository.updateDated(tenantId, id, toWrite(data, dateInDisplayTz(now)));
  if (!updated) throw new NotificationNotFoundError('not_found');
  syncAgenda(tenantId, id, updated);
  return updated;
};

export const deleteNotification = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await notificationRepository.deleteDated(tenantId, id);
  if (deletedCount === 0) throw new NotificationNotFoundError('not_found');
  syncAgenda(tenantId, id);
};

// With `caseId`, the case must exist (404 otherwise).
export const listNotifications = async (tenantId: string, query: ListNotificationsQuery) => {
  if (query.caseId) await caseService.getCase(tenantId, query.caseId);
  const result = await notificationRepository.listDated(tenantId, query);
  return { ...result, items: await withCase(tenantId, result.items) };
};

export const listCaseNotifications = (tenantId: string, caseId: string) =>
  notificationRepository.listByCase(tenantId, caseId);

export const listPending = async (tenantId: string, range: { from?: string; to?: string } = {}) =>
  withCase(tenantId, await notificationRepository.listPending(tenantId, range));

// Completing the report with delivery (AD-126): files today the oldest pending "Entrega do laudo"
// deadline of the case; with none pending, does nothing.
export const fileReportDelivery = async (tenantId: string, caseId: string, now: Date = new Date()) => {
  const filed = await notificationRepository.filePending(tenantId, caseId, REPORT_DELIVERY_TITLE, dateInDisplayTz(now));
  if (filed) syncAgenda(tenantId, filed.id, filed);
  return filed;
};

// Case deleted (`case:deleted`): its notifications go along; the agenda drops its own entries by case.
export const deleteByCase = (tenantId: string, caseId: string) => notificationRepository.deleteByCase(tenantId, caseId);

export const listForExport = (tenantId: string) => notificationRepository.listAll(tenantId);

// D5: a person sees the notices of the modules they can view (finance only with `finance` `view`).
const visibleModules = (permissions: Permissions): NotificationModule[] =>
  NOTIFICATION_MODULES.filter((module) => hasPermission(permissions, module, 'view'));

export const listNotices = (tenantId: string, userId: string, permissions: Permissions, query: ListNoticesQuery) =>
  notificationRepository.listNotices(tenantId, userId, visibleModules(permissions), query);

export const countUnread = (tenantId: string, userId: string, permissions: Permissions) =>
  notificationRepository.countUnread(tenantId, userId, visibleModules(permissions));

export const markRead = async (tenantId: string, userId: string, permissions: Permissions, id: string) => {
  const { matchedCount } = await notificationRepository.markRead(tenantId, userId, visibleModules(permissions), id);
  if (matchedCount === 0) throw new NotificationNotFoundError('not_found');
};

export const markAllRead = (tenantId: string, userId: string, permissions: Permissions) =>
  notificationRepository.markRead(tenantId, userId, visibleModules(permissions));
