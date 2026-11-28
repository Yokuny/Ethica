import {
  CASE_CLOSED_PHASES,
  CASE_PHASE_GROUPS,
  caseFillOf,
  caseLabel,
  hasPermission,
  NOTIFICATION_MODULES,
  type NotificationModule,
  notificationAgendaEntries,
  type Permissions,
  proposalFits,
  REPORT_DELIVERY_TITLE,
  validNotificationStatus,
} from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { suggestionDecisions } from '../../metrics/automation.metric.js';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as transactionService from '../finance/transaction.service.js';
import * as billingService from '../identity/billing.service.js';
import * as notificationRepository from './notification.repository.js';
import type {
  AcceptSuggestion,
  CreateNotification,
  DatedNotification,
  ListNotificationsQuery,
  NotificationRecord,
  NotificationWrite,
  RejectSuggestion,
  SuggestionRecord,
  UpdateNotification,
} from './notification.schema.js';

// Agreement, dismissal or removal: the process ended, its deadlines no longer run.
const LOSS_PHASES: readonly string[] = [...CASE_PHASE_GROUPS.losses, 'assistance_settlement'];

// The case of each one (number, contracting party, kind of service) in one batch; a notice may have none.
const withCase = async <T extends NotificationRecord>(tenantId: string, items: T[]): Promise<T[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.caseId ? [item.caseId] : [])))];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const summary = item.caseId ? summaries.get(item.caseId) : undefined;
    if (!summary) return item;
    const { client, plaintiff, defendant, serviceType, courtType } = summary;
    return { ...item, caseNumber: caseLabel(summary), client, plaintiff, defendant, serviceType, courtType };
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

// Missing case (or from another tenant) → the same 404 as the case.
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
    if (!before) throw new CustomError('not_found', 404);
    if (!validNotificationStatus(before.kind, data.status)) throw new CustomError('invalid_notification_status', 422);
  }
  const updated = await notificationRepository.updateDated(tenantId, id, toWrite(data, dateInDisplayTz(now)));
  if (!updated) throw new CustomError('not_found', 404);
  syncAgenda(tenantId, id, updated);
  return updated;
};

export const deleteNotification = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await notificationRepository.deleteDated(tenantId, id);
  if (deletedCount === 0) throw new CustomError('not_found', 404);
  syncAgenda(tenantId, id);
};

// D5: a person sees the notifications of the modules they can view (finance only with `finance` `view`).
const visibleModules = (permissions: Permissions): NotificationModule[] =>
  NOTIFICATION_MODULES.filter((module) => hasPermission(permissions, module, 'view'));

// The suggestions of the Automação panel (PAT-05), of the modules the person sees (D5).
export const suggestionActivity = (tenantId: string, permissions: Permissions, since: Date) =>
  notificationRepository.suggestionActivity(tenantId, visibleModules(permissions), since);

type Reader = { tenantId: string; userId: string; permissions: Permissions };

// One list for every kind (AD-282). With `caseId`, the case must exist (404 otherwise).
export const listNotifications = async ({ tenantId, userId, permissions }: Reader, query: ListNotificationsQuery) => {
  if (query.caseId) await caseService.getCase(tenantId, query.caseId);
  const result = await notificationRepository.list(tenantId, userId, visibleModules(permissions), query);
  return { ...result, items: await withCase(tenantId, result.items) };
};

export const countDue = ({ tenantId, userId, permissions }: Reader, now: Date = new Date()) =>
  notificationRepository.countDue(tenantId, userId, visibleModules(permissions), dateInDisplayTz(now));

export const markRead = async ({ tenantId, userId, permissions }: Reader, id: string) => {
  const { matchedCount } = await notificationRepository.markRead(tenantId, userId, visibleModules(permissions), id);
  if (matchedCount === 0) throw new CustomError('not_found', 404);
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

// Deciding asks to change the data of the suggestion module (D5): cases or finance.
const findDecidable = async ({ tenantId, permissions }: Reader, id: string): Promise<SuggestionRecord> => {
  const suggestion = await notificationRepository.findPendingSuggestion(tenantId, id);
  if (!suggestion) throw new CustomError('not_found', 404);
  if (!hasPermission(permissions, suggestion.module, 'update')) throw new CustomError('no_permission', 403);
  return suggestion;
};

// What the accepted suggestion changes, by the service that owns the data (AD-268).
const apply = async (tenantId: string, suggestion: SuggestionRecord, data: AcceptSuggestion): Promise<void> => {
  const { proposal, caseId } = suggestion;
  if (proposal.target === 'case_status') {
    await caseService.updateCase(tenantId, caseId, { status: proposal.value });
    return;
  }
  if (proposal.target === 'case_phase') {
    await caseService.updateCase(tenantId, caseId, { phase: proposal.value });
    return;
  }
  if (proposal.target === 'case_fill') {
    // Only what is still empty now (SGD-07): a field typed by hand is never overwritten.
    const fill = caseFillOf(await caseService.getCase(tenantId, caseId), proposal);
    if (fill) await caseService.updateCase(tenantId, caseId, fill);
    return;
  }
  if (proposal.target === 'notifications_cancel') {
    for (const item of await notificationRepository.listByCase(tenantId, caseId)) {
      if (item.status === 'pending') await updateNotification(tenantId, item.id, { status: 'canceled' });
    }
    return;
  }
  // Receipt (AD-269): an open income of this case, with the amount, date and account the person confirmed.
  if (!data.transactionId || !data.amountCents || !data.date) throw new CustomError('invalid_data', 422);
  const transaction = await transactionService.getTransaction(tenantId, data.transactionId);
  if (transaction.caseId !== caseId) throw new CustomError('invalid_data', 422);
  await transactionService.addInstallment(tenantId, data.transactionId, {
    amountCents: data.amountCents,
    date: data.date,
    ...(data.account ? { account: data.account } : {}),
  });
};

// Accepting applies through the service that owns the data, with the validations and events of the manual edit
// (AD-268): already as proposed → superseded; no longer fits → 409 `suggestion_outdated`; a service failure puts
// it back to pending. Closing the case by agreement or dismissal supersedes its other pending suggestions and
// offers to cancel its pending deadlines and alerts.
export const acceptSuggestion = async (
  decider: Reader,
  id: string,
  data: AcceptSuggestion,
): Promise<SuggestionRecord> => {
  const { tenantId, userId } = decider;
  // Without the module the suggestions are only read (AD-270).
  await billingService.ensureAutomation(tenantId);
  const suggestion = await findDecidable(decider, id);
  const legalCase = await caseService.getCase(tenantId, suggestion.caseId);
  const fit = proposalFits(legalCase, suggestion.proposal);
  if (fit === 'already') {
    const superseded = await notificationRepository.decideSuggestion(tenantId, id, { status: 'superseded', userId });
    if (!superseded) throw new CustomError('suggestion_outdated', 409);
    suggestionDecisions.inc({ rule: suggestion.ruleKey, decision: 'superseded' });
    return superseded;
  }
  if (fit === 'impossible') throw new CustomError('suggestion_outdated', 409);
  const accepted = await notificationRepository.decideSuggestion(tenantId, id, { status: 'accepted', userId });
  if (!accepted) throw new CustomError('suggestion_outdated', 409);
  try {
    await apply(tenantId, suggestion, data);
  } catch (e) {
    await notificationRepository.reopenSuggestion(tenantId, id);
    throw e;
  }
  const { proposal } = suggestion;
  if (proposal.target === 'case_phase' && CASE_CLOSED_PHASES.includes(proposal.value)) {
    await notificationRepository.supersedeCaseSuggestions(tenantId, suggestion.caseId);
    const pending = (await notificationRepository.listByCase(tenantId, suggestion.caseId)).filter(
      (item) => item.status === 'pending',
    ).length;
    if (pending > 0 && LOSS_PHASES.includes(proposal.value)) {
      await notificationRepository.createCancelSuggestion(tenantId, suggestion.caseId, pending, suggestion.evidence);
    }
  }
  suggestionDecisions.inc({ rule: suggestion.ruleKey, decision: 'accepted' });
  return accepted;
};

export const rejectSuggestion = async (decider: Reader, id: string, { reason }: RejectSuggestion) => {
  await findDecidable(decider, id);
  const rejected = await notificationRepository.decideSuggestion(decider.tenantId, id, {
    status: 'rejected',
    userId: decider.userId,
    rejectReason: reason,
  });
  if (!rejected) throw new CustomError('not_found', 404);
  suggestionDecisions.inc({ rule: rejected.ruleKey, decision: 'rejected' });
  return rejected;
};
