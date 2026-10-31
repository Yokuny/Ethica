export { connect, disconnect } from './connection.js';
export type { EncryptedSecret } from './crypto.helper.js';
export { decrypt, encrypt, maskSecret, sha256 } from './crypto.helper.js';
export { dailyTrend } from './dailyTrend.js';
export { groupStats } from './groupStats.js';
export type { CompromissoDocument, CompromissoOrigem } from './models/compromisso.model.js';
export { Compromisso } from './models/compromisso.model.js';
export type { InviteDocument, InviteStatus } from './models/invite.model.js';
export { hashToken, Invite } from './models/invite.model.js';
export type { LancamentoDocument, ParcelaDocument } from './models/lancamento.model.js';
export { Lancamento } from './models/lancamento.model.js';
export type { OportunidadeDocument } from './models/oportunidade.model.js';
export { Oportunidade } from './models/oportunidade.model.js';
export type { PericiaDocument } from './models/pericia.model.js';
export { Pericia } from './models/pericia.model.js';
export type { PrazoDocument } from './models/prazo.model.js';
export { Prazo } from './models/prazo.model.js';
export type { SessionDocument } from './models/session.model.js';
export { Session } from './models/session.model.js';
export type { TenantDocument, TenantStatus } from './models/tenant.model.js';
export { Tenant, transitionTenantStatus } from './models/tenant.model.js';
export type { UserDocument } from './models/user.model.js';
export { User } from './models/user.model.js';
export { tenantScoped } from './tenantScoped.js';
export { resolveTestDatabaseUri, TEST_DATABASE_ENV, wipeTestDatabase } from './testDatabase.js';
export type { PericiaSearchSpec, SearchIndexStatus, SearchStage } from './textSearch.js';
export {
  isSearchUnavailableError,
  newObjectId,
  periciaSearchStages,
  provisionSearchIndexes,
  SEARCH_INDEXES,
  searchDefinitionMatches,
  TextSearchUnavailableError,
  toObjectId,
  withSearch,
} from './textSearch.js';
export { dateInDisplayTz, timeInDisplayTz, wallClockToUtc } from './time.js';

import { Compromisso } from './models/compromisso.model.js';
import { Invite } from './models/invite.model.js';
import { Lancamento } from './models/lancamento.model.js';
import { Oportunidade } from './models/oportunidade.model.js';
import { Pericia } from './models/pericia.model.js';
import { Prazo } from './models/prazo.model.js';
import { Session } from './models/session.model.js';
import { Tenant } from './models/tenant.model.js';
import { User } from './models/user.model.js';

export const syncIndexes = async (): Promise<void> => {
  await Promise.all([
    Tenant.createIndexes(),
    User.createIndexes(),
    Invite.createIndexes(),
    Session.createIndexes(),
    Pericia.createIndexes(),
    Prazo.createIndexes(),
    Compromisso.createIndexes(),
    Lancamento.createIndexes(),
    Oportunidade.createIndexes(),
  ]);
};
