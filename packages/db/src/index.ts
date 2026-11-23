export { connect, disconnect, isConnected } from './connection.js';
export type { EncryptedSecret } from './crypto.helper.js';
export { decrypt, encrypt, maskSecret, sha256 } from './crypto.helper.js';
export { dailyTrend } from './dailyTrend.js';
export { groupStats } from './groupStats.js';
export type { AccessKeyDocument } from './models/access-key.model.js';
export { AccessKey } from './models/access-key.model.js';
export type { ActivityDocument } from './models/activity.model.js';
export { Activity } from './models/activity.model.js';
export type { AppointmentDocument, AppointmentOrigin } from './models/appointment.model.js';
export { Appointment } from './models/appointment.model.js';
export type { CalendarEntryDocument } from './models/calendar-entry.model.js';
export { backfillCalendarEntries, CalendarEntry } from './models/calendar-entry.model.js';
export type { CaseDocument, CaseMovementDocument, CasePartyDocument } from './models/case.model.js';
export { Case, migrateCases } from './models/case.model.js';
export type { CaseCourtSyncDocument } from './models/case-court-sync.model.js';
export { CaseCourtSync } from './models/case-court-sync.model.js';
export type { CourtDivisionDocument } from './models/court-division.model.js';
export { COURT_DIVISION_COLLATION, CourtDivision } from './models/court-division.model.js';
export type { CourtProcessDocument } from './models/court-process.model.js';
export { CourtProcess } from './models/court-process.model.js';
export type { InspectionDocument, InspectionMediaDocument } from './models/inspection.model.js';
export { Inspection } from './models/inspection.model.js';
export type { InviteDocument, InviteStatus } from './models/invite.model.js';
export { hashToken, Invite } from './models/invite.model.js';
export type { NotificationDocument } from './models/notification.model.js';
export { Notification } from './models/notification.model.js';
export type { NotificationDeliveryDocument } from './models/notification-delivery.model.js';
export { NotificationDelivery } from './models/notification-delivery.model.js';
export type { PartyDocument } from './models/party.model.js';
export { Party } from './models/party.model.js';
export type { PasskeyDocument } from './models/passkey.model.js';
export { Passkey } from './models/passkey.model.js';
export type { PushSubscriptionDocument } from './models/push-subscription.model.js';
export { PushSubscription } from './models/push-subscription.model.js';
export type { ReportDocument, ReportMediaDocument, ReportSectionDocument } from './models/report.model.js';
export { Report } from './models/report.model.js';
export type { RetiredServiceOrderDocument, ServiceOrderSequenceDocument } from './models/service-order.model.js';
export { RetiredServiceOrder, ServiceOrderSequence } from './models/service-order.model.js';
export type { SessionDocument } from './models/session.model.js';
export { Session } from './models/session.model.js';
export type { SignatoryDocument } from './models/signatory.model.js';
export { Signatory } from './models/signatory.model.js';
export type { TemplateDocument, TemplateSectionDocument } from './models/template.model.js';
export { Template } from './models/template.model.js';
export type { TenantBilling, TenantDocument, TenantStatus } from './models/tenant.model.js';
export { isTenantOpen, openTenantFilter, Tenant, transitionTenantStatus } from './models/tenant.model.js';
export type { InstallmentDocument, TransactionDocument } from './models/transaction.model.js';
export { Transaction } from './models/transaction.model.js';
export type { UserDocument } from './models/user.model.js';
export { migrateUsers, User } from './models/user.model.js';
export type { WorkerHeartbeatDocument } from './models/worker-heartbeat.model.js';
export { WorkerHeartbeat } from './models/worker-heartbeat.model.js';
export type { WorkerJobDocument, WorkerJobStatus } from './models/worker-job.model.js';
export { WORKER_JOB_STATUS, WorkerJob } from './models/worker-job.model.js';
export { caseIdsDueBetween, nextDueByCases, pendingDueCounts } from './notificationReads.js';
export { tenantScoped } from './tenantScoped.js';
export { resolveTestDatabaseUri, TEST_DATABASE_ENV, wipeTestDatabase } from './testDatabase.js';
export type { CaseSearchSpec, PartySearchSpec, SearchIndexStatus, SearchStage } from './textSearch.js';
export {
  caseSearchStages,
  isSearchUnavailableError,
  newObjectId,
  partySearchStages,
  provisionSearchIndexes,
  SEARCH_INDEXES,
  searchDefinitionMatches,
  TextSearchUnavailableError,
  toObjectId,
  withSearch,
} from './textSearch.js';
export { dateInDisplayTz, shiftMonth, timeInDisplayTz, wallClockToUtc } from './time.js';
export type {
  DeliveryRecipient,
  DueItem,
  FinanceDueItem,
  NoticeForDelivery,
  PendingSuggestion,
  TrackedCase,
} from './workerReads.js';
export {
  caseLabelsByIds,
  findNoticeForDelivery,
  listAutomationEnding,
  listDeliveryRecipients,
  listFinanceDueUntil,
  listPendingDueOn,
  listPendingSuggestions,
  listPushSubscriptions,
  listTrackedCases,
} from './workerReads.js';

import { AccessKey } from './models/access-key.model.js';
import { Appointment } from './models/appointment.model.js';
import { CalendarEntry } from './models/calendar-entry.model.js';
import { Case } from './models/case.model.js';
import { CaseCourtSync } from './models/case-court-sync.model.js';
import { CourtDivision } from './models/court-division.model.js';
import { CourtProcess } from './models/court-process.model.js';
import { Inspection } from './models/inspection.model.js';
import { Invite } from './models/invite.model.js';
import { Notification } from './models/notification.model.js';
import { NotificationDelivery } from './models/notification-delivery.model.js';
import { Party } from './models/party.model.js';
import { Passkey } from './models/passkey.model.js';
import { PushSubscription } from './models/push-subscription.model.js';
import { Report } from './models/report.model.js';
import { RetiredServiceOrder, ServiceOrderSequence } from './models/service-order.model.js';
import { Session } from './models/session.model.js';
import { Signatory } from './models/signatory.model.js';
import { Template } from './models/template.model.js';
import { Tenant } from './models/tenant.model.js';
import { Transaction } from './models/transaction.model.js';
import { User } from './models/user.model.js';
import { WorkerHeartbeat } from './models/worker-heartbeat.model.js';
import { WorkerJob } from './models/worker-job.model.js';

// Each service creates only the indexes of the models it owns (D6 of the worker plan, AD-267).
export const syncIndexes = async (): Promise<void> => {
  await Promise.all([
    Tenant.createIndexes(),
    User.createIndexes(),
    PushSubscription.createIndexes(),
    Invite.createIndexes(),
    Session.createIndexes(),
    Passkey.createIndexes(),
    AccessKey.createIndexes(),
    // syncIndexes replaces the old unique process number index by the partial one (AD-158).
    Case.syncIndexes(),
    Signatory.createIndexes(),
    ServiceOrderSequence.createIndexes(),
    RetiredServiceOrder.createIndexes(),
    Party.createIndexes(),
    CourtDivision.createIndexes(),
    Notification.createIndexes(),
    Appointment.createIndexes(),
    CalendarEntry.createIndexes(),
    Transaction.createIndexes(),
    Report.createIndexes(),
    Template.createIndexes(),
    Inspection.createIndexes(),
  ]);
};

export const syncWorkerIndexes = async (): Promise<void> => {
  await Promise.all([
    WorkerJob.createIndexes(),
    WorkerHeartbeat.createIndexes(),
    NotificationDelivery.createIndexes(),
    CourtProcess.createIndexes(),
    CaseCourtSync.createIndexes(),
  ]);
};
