import {
  CASE_CLOSED_PHASES,
  type CasePhase,
  type CaseProposal,
  type CaseStatus,
  caseLabel,
  courtUnitFromNumber,
  effectivePermissions,
  type NotificationPreferences,
  type Permissions,
  type Role,
  type ServiceType,
  TRACKED_COURT_TYPES,
} from '@ethica/contracts';
import { Case } from './models/case.model.js';
import { Notification } from './models/notification.model.js';
import { PushSubscription } from './models/push-subscription.model.js';
import { openTenantFilter, Tenant } from './models/tenant.model.js';
import { Transaction } from './models/transaction.model.js';
import { User } from './models/user.model.js';
import { toObjectId } from './textSearch.js';

// Read-only functions for the worker (AD-265, AD-267): it never imports a service of the api. No writes here.

export type DeliveryRecipient = {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  permissions: Permissions;
  preferences?: NotificationPreferences;
};

// Active people with a role, from open offices (AD-098, AD-230), with their effective permissions (AD-137).
export const listDeliveryRecipients = async (tenantIds: string[], now = new Date()): Promise<DeliveryRecipient[]> => {
  if (tenantIds.length === 0) return [];
  const open = await Tenant.find({ _id: { $in: tenantIds.map(toObjectId) }, ...openTenantFilter(now) })
    .select('_id')
    .lean();
  const users = await User.find({
    Tenant: { $in: open.map((tenant) => tenant._id) },
    active: true,
    'role.0': { $exists: true },
  })
    .select('Tenant name email role permissions preferences')
    .lean();
  return users.map((user) => ({
    userId: user._id.toString(),
    tenantId: String(user.Tenant),
    name: user.name,
    email: user.email,
    permissions: effectivePermissions(user.role as Role[], user.permissions),
    preferences: user.preferences?.notifications,
  }));
};

export type DueItem = { id: string; tenantId: string; caseId: string; title: string; dueDate: string };

// Pending deadlines and alerts due on the given days, across offices (the digest, AD-110).
export const listPendingDueOn = async (days: string[]): Promise<DueItem[]> => {
  const docs = await Notification.find({
    kind: { $in: ['deadline', 'alert'] },
    status: 'pending',
    dueDate: { $in: days },
  })
    .sort({ dueDate: 1, _id: 1 })
    .lean();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    tenantId: doc.Tenant.toString(),
    caseId: String(doc.Case),
    title: doc.title ?? '',
    dueDate: doc.dueDate ?? '',
  }));
};

export type FinanceDueItem = {
  id: string;
  tenantId: string;
  caseId?: string;
  kind: 'income' | 'expense';
  description: string;
  dueDate: string;
  openCents: number;
};

// Open transactions (expected or partial) due up to `until`, overdue included (AVS-02), across offices.
export const listFinanceDueUntil = async (until: string): Promise<FinanceDueItem[]> => {
  const docs = await Transaction.find({ status: { $in: ['expected', 'partial'] }, dueDate: { $lte: until } })
    .sort({ dueDate: 1, _id: 1 })
    .lean();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    tenantId: doc.Tenant.toString(),
    caseId: doc.Case ? doc.Case.toString() : undefined,
    kind: doc.kind,
    description: doc.description,
    dueDate: doc.dueDate,
    openCents: doc.amountCents - (doc.installments ?? []).reduce((sum, item) => sum + item.amountCents, 0),
  }));
};

// Readable label of each case (process number or, without one, the subject), in one query.
export const caseLabelsByIds = async (tenantId: string, ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) return new Map();
  const docs = await Case.find({ Tenant: toObjectId(tenantId), _id: { $in: ids.map(toObjectId) } })
    .select('processNumber subject')
    .lean();
  return new Map(docs.map((doc) => [doc._id.toString(), caseLabel(doc)]));
};

export type NoticeForDelivery = {
  id: string;
  tenantId: string;
  kind: 'deadline' | 'alert' | 'suggestion' | 'notice';
  proposal?: CaseProposal;
  evidence?: { court: string; movement: { name: string; at: string } };
  module: 'expert_cases' | 'finance';
  topic?: string;
  params?: Record<string, string | number>;
  caseId?: string;
};

// A notification to be delivered right away (`email_immediate`).
export const findNoticeForDelivery = async (id: string): Promise<NoticeForDelivery | null> => {
  const doc = await Notification.findById(id).lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    tenantId: doc.Tenant.toString(),
    kind: doc.kind,
    proposal: doc.proposal,
    evidence: doc.evidence,
    module: doc.module,
    topic: doc.topic,
    params: doc.params,
    caseId: doc.Case ? doc.Case.toString() : undefined,
  };
};

// Offices whose Automação Datajud ends within `days` (AD-275), still on.
export const listAutomationEnding = async (
  days: number,
  now = new Date(),
): Promise<{ tenantId: string; automationUntil: Date }[]> => {
  const until = new Date(now.getTime() + days * 86_400_000);
  const tenants = await Tenant.find({ automationUntil: { $gt: now, $lte: until } })
    .select('automationUntil')
    .lean();
  return tenants.map((tenant) => ({
    tenantId: tenant._id.toString(),
    automationUntil: tenant.automationUntil as Date,
  }));
};

export type TrackedCase = {
  tenantId: string;
  caseId: string;
  processNumber: string;
  court: string;
  serviceType: ServiceType;
  status: CaseStatus;
  phase: CasePhase;
  division?: string;
  docketingDate?: string;
};

// Cases followed in court (ADT-02, PAC-03): offices with the module on, a valid CNJ number of a tracked court
// type, a judicial type (perícia or technical assistance) and the case not closed. Derived on every run; the worker reads every office, the api
// one office (the Automação page).
export const listTrackedCases = async (now = new Date(), tenantId?: string): Promise<TrackedCase[]> => {
  const tenants = await Tenant.find({
    ...(tenantId ? { _id: toObjectId(tenantId) } : {}),
    automationUntil: { $gt: now },
    ...openTenantFilter(now),
  })
    .select('_id')
    .lean();
  if (tenants.length === 0) return [];
  const cases = await Case.find({
    Tenant: { $in: tenants.map((tenant) => tenant._id) },
    processNumber: { $type: 'string' },
    serviceType: { $in: ['expert_examination', 'technical_assistance'] },
    status: { $ne: 'canceled' },
    phase: { $nin: [...CASE_CLOSED_PHASES] },
  })
    .select('Tenant processNumber serviceType status phase division docketingDate')
    .lean();
  return cases.flatMap((doc) => {
    const unit = doc.processNumber ? courtUnitFromNumber(doc.processNumber) : undefined;
    if (!unit || !TRACKED_COURT_TYPES.includes(unit.courtType)) return [];
    return [
      {
        tenantId: String(doc.Tenant),
        caseId: doc._id.toString(),
        processNumber: doc.processNumber as string,
        court: unit.court,
        serviceType: doc.serviceType,
        status: doc.status,
        phase: doc.phase,
        division: doc.division,
        docketingDate: doc.docketingDate,
      },
    ];
  });
};

export type PendingSuggestion = {
  id: string;
  tenantId: string;
  proposal: CaseProposal;
  automation: boolean;
  legalCase?: {
    serviceType: ServiceType;
    status: CaseStatus;
    phase: CasePhase;
    division?: string;
    docketingDate?: string;
  };
};

// Pending suggestions with what decides if they still fit: the module of the office and the case now.
export const listPendingSuggestions = async (now = new Date()): Promise<PendingSuggestion[]> => {
  const docs = await Notification.find({ kind: 'suggestion', status: 'pending' }).select('Tenant Case proposal').lean();
  if (docs.length === 0) return [];
  const [tenants, cases] = await Promise.all([
    Tenant.find({ _id: { $in: docs.map((doc) => doc.Tenant) } })
      .select('automationUntil')
      .lean(),
    Case.find({ _id: { $in: docs.flatMap((doc) => (doc.Case ? [doc.Case] : [])) } })
      .select('serviceType status phase division docketingDate')
      .lean(),
  ]);
  const active = new Set(
    tenants
      .filter((tenant) => tenant.automationUntil && tenant.automationUntil > now)
      .map((tenant) => String(tenant._id)),
  );
  const byId = new Map(cases.map((doc) => [String(doc._id), doc]));
  return docs.map((doc) => {
    const legalCase = byId.get(String(doc.Case));
    return {
      id: doc._id.toString(),
      tenantId: String(doc.Tenant),
      proposal: doc.proposal as CaseProposal,
      automation: active.has(String(doc.Tenant)),
      legalCase: legalCase
        ? {
            serviceType: legalCase.serviceType,
            status: legalCase.status,
            phase: legalCase.phase,
            division: legalCase.division,
            docketingDate: legalCase.docketingDate,
          }
        : undefined,
    };
  });
};

// Push inscriptions of the people (AVS-03), by user.
export const listPushSubscriptions = async (
  userIds: string[],
): Promise<Map<string, { endpoint: string; keys: { p256dh: string; auth: string } }[]>> => {
  const map = new Map<string, { endpoint: string; keys: { p256dh: string; auth: string } }[]>();
  if (userIds.length === 0) return map;
  const docs = await PushSubscription.find({ User: { $in: userIds.map(toObjectId) } }).lean();
  for (const doc of docs) {
    const user = String(doc.User);
    map.set(user, [...(map.get(user) ?? []), { endpoint: doc.endpoint, keys: doc.keys }]);
  }
  return map;
};
