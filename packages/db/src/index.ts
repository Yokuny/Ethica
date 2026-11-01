export { connect, disconnect } from './connection.js';
export type { EncryptedSecret } from './crypto.helper.js';
export { decrypt, encrypt, maskSecret, sha256 } from './crypto.helper.js';
export { dailyTrend } from './dailyTrend.js';
export { groupStats } from './groupStats.js';
export type { AppointmentDocument, AppointmentOrigin } from './models/appointment.model.js';
export { Appointment } from './models/appointment.model.js';
export type { AtividadeDocument } from './models/atividade.model.js';
export { Atividade } from './models/atividade.model.js';
export type { CaseDocument, CaseMovementDocument, CasePartyDocument } from './models/case.model.js';
export { Case } from './models/case.model.js';
export type { DeadlineDocument } from './models/deadline.model.js';
export { Deadline } from './models/deadline.model.js';
export type { InspectionDocument, InspectionMediaDocument } from './models/inspection.model.js';
export { Inspection } from './models/inspection.model.js';
export type { InviteDocument, InviteStatus } from './models/invite.model.js';
export { hashToken, Invite } from './models/invite.model.js';
export type { LaudoDocument, LaudoSecaoDocument } from './models/laudo.model.js';
export { Laudo } from './models/laudo.model.js';
export type { ModeloLaudoDocument, ModeloLaudoSecaoDocument } from './models/modeloLaudo.model.js';
export { ModeloLaudo } from './models/modeloLaudo.model.js';
export type { OportunidadeDocument } from './models/oportunidade.model.js';
export { Oportunidade } from './models/oportunidade.model.js';
export type { PartyDocument } from './models/party.model.js';
export { Party } from './models/party.model.js';
export type { SessionDocument } from './models/session.model.js';
export { Session } from './models/session.model.js';
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
import { Laudo } from './models/laudo.model.js';
import { ModeloLaudo } from './models/modeloLaudo.model.js';
import { Oportunidade } from './models/oportunidade.model.js';
import { Party } from './models/party.model.js';
import { Session } from './models/session.model.js';
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
    Oportunidade.createIndexes(),
    Laudo.createIndexes(),
    ModeloLaudo.createIndexes(),
    Inspection.createIndexes(),
  ]);
};
