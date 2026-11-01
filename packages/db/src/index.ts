export { connect, disconnect } from './connection.js';
export type { EncryptedSecret } from './crypto.helper.js';
export { decrypt, encrypt, maskSecret, sha256 } from './crypto.helper.js';
export { dailyTrend } from './dailyTrend.js';
export { groupStats } from './groupStats.js';
export type { ActivityDocument } from './models/activity.model.js';
export { Activity } from './models/activity.model.js';
export type { AppointmentDocument, AppointmentOrigin } from './models/appointment.model.js';
export { Appointment } from './models/appointment.model.js';
export type { CaseDocument, CaseMovementDocument, CasePartyDocument } from './models/case.model.js';
export { Case } from './models/case.model.js';
export type { DeadlineDocument } from './models/deadline.model.js';
export { Deadline } from './models/deadline.model.js';
export type { InspectionDocument, InspectionMediaDocument } from './models/inspection.model.js';
export { Inspection } from './models/inspection.model.js';
export type { InviteDocument, InviteStatus } from './models/invite.model.js';
export { hashToken, Invite } from './models/invite.model.js';
export type { OpportunityDocument } from './models/opportunity.model.js';
export { Opportunity } from './models/opportunity.model.js';
export type { PartyDocument } from './models/party.model.js';
export { Party } from './models/party.model.js';
export type { ReportDocument, ReportSectionDocument } from './models/report.model.js';
export { Report } from './models/report.model.js';
export type { SessionDocument } from './models/session.model.js';
export { Session } from './models/session.model.js';
export type { TemplateDocument, TemplateSectionDocument } from './models/template.model.js';
export { Template } from './models/template.model.js';
export type { TenantDocument, TenantStatus } from './models/tenant.model.js';
export { Tenant, transitionTenantStatus } from './models/tenant.model.js';
export type { InstallmentDocument, TransactionDocument } from './models/transaction.model.js';
export { Transaction } from './models/transaction.model.js';
export type { UserDocument } from './models/user.model.js';
export { User } from './models/user.model.js';
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
export { dateInDisplayTz, timeInDisplayTz, wallClockToUtc } from './time.js';

import { Appointment } from './models/appointment.model.js';
import { Case } from './models/case.model.js';
import { Deadline } from './models/deadline.model.js';
import { Inspection } from './models/inspection.model.js';
import { Invite } from './models/invite.model.js';
import { Opportunity } from './models/opportunity.model.js';
import { Party } from './models/party.model.js';
import { Report } from './models/report.model.js';
import { Session } from './models/session.model.js';
import { Template } from './models/template.model.js';
import { Tenant } from './models/tenant.model.js';
import { Transaction } from './models/transaction.model.js';
import { User } from './models/user.model.js';

export const syncIndexes = async (): Promise<void> => {
  await Promise.all([
    Tenant.createIndexes(),
    User.createIndexes(),
    Invite.createIndexes(),
    Session.createIndexes(),
    Case.createIndexes(),
    Party.createIndexes(),
    Deadline.createIndexes(),
    Appointment.createIndexes(),
    Transaction.createIndexes(),
    Opportunity.createIndexes(),
    Report.createIndexes(),
    Template.createIndexes(),
    Inspection.createIndexes(),
  ]);
};
