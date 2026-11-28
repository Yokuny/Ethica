import { randomUUID } from 'node:crypto';
import {
  CASE_ATTACHMENT_LIMIT,
  type CaseInspection,
  type CasePayment,
  caseLabel,
  DUE_SOON_DAYS,
  defaultPhase,
  formatServiceOrder,
  REPORT_DELIVERY_TITLE,
  SERVICE_DELIVERY_TITLE,
  type ServiceOrderSettings,
  STALLED_CASE_DAYS,
  suggestNonPrescribedPeriod,
  usesContractor,
  validClient,
  validServiceType,
} from '@ethica/contracts';
import {
  caseIdsDueBetween,
  dateInDisplayTz,
  listTrackedCases,
  nextDueByCases,
  shiftMonth,
  TextSearchUnavailableError,
} from '@ethica/db';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import type { FileStorage } from '../../providers/file-storage.js';
import * as officeService from '../identity/office.service.js';
import * as caseRepository from './case.repository.js';
import type {
  CaseListItem,
  CaseRecord,
  CreateCaseInput,
  CreateMovement,
  ListCasesQuery,
  ServiceOrderPreview,
  StalledCase,
  UpdateCase,
} from './case.schema.js';
import * as partyService from './party.service.js';
import * as serviceOrderRepository from './service-order.repository.js';

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// The repeated value: the service order number (NLA-01) or, otherwise, the process number.
const duplicateError = (e: unknown): CustomError =>
  (e as { keyPattern?: Record<string, unknown> }).keyPattern?.serviceOrder
    ? new CustomError('service_order_taken', 409)
    : new CustomError('expert_case_already_registered', 409);

export const getServiceOrder = (tenantId: string) => serviceOrderRepository.find(tenantId);

export const setServiceOrder = (tenantId: string, data: ServiceOrderSettings) =>
  serviceOrderRepository.save(tenantId, data);

// A number is never repeated (AD-187): not by another service, open or closed, nor by a deleted one.
const serviceOrderTaken = async (tenantId: string, serviceOrder: string): Promise<boolean> =>
  (await caseRepository.hasServiceOrder(tenantId, serviceOrder)) ||
  (await serviceOrderRepository.isRetired(tenantId, serviceOrder));

// Next free number of the office sequence (NLA-01), e.g. "ETH-2026-009"; `undefined` without a sequence. A
// number already used (typed by hand or after the counter went back) is skipped.
const nextServiceOrder = async (tenantId: string): Promise<string | undefined> => {
  const year = Number(dateInDisplayTz(new Date()).slice(0, 4));
  for (let attempt = 0; attempt < 100; attempt++) {
    const sequence = await serviceOrderRepository.take(tenantId, year);
    if (!sequence) return undefined;
    const serviceOrder = formatServiceOrder(sequence).toUpperCase();
    if (!(await serviceOrderTaken(tenantId, serviceOrder))) return serviceOrder;
  }
  throw new CustomError('service_order_taken', 409);
};

// Last number used and the one the next registration gets (AD-190), without taking it: the same rule of
// `take` (another year starts again at 1 with "[ANO]") skipping the used ones. Without a sequence, only the last.
export const serviceOrderPreview = async (tenantId: string): Promise<ServiceOrderPreview> => {
  const [last, settings] = await Promise.all([
    caseRepository.lastServiceOrder(tenantId),
    serviceOrderRepository.find(tenantId),
  ]);
  if (!settings) return { last };
  const year = Number(dateInDisplayTz(new Date()).slice(0, 4));
  let number = settings.year === year || !settings.pattern.includes('[ANO]') ? settings.last + 1 : 1;
  for (let attempt = 0; attempt < 100; attempt++, number++) {
    const next = formatServiceOrder({ ...settings, year, last: number }).toUpperCase();
    if (!(await serviceOrderTaken(tenantId, next))) return { last, next };
  }
  return { last };
};

// With no non-prescribed period given, saves the one suggested by the contract dates (AD-115).
const withSuggestedPeriod = <T extends CreateCaseInput>(input: T): T => {
  if (input.nonPrescribedPeriodStart || input.nonPrescribedPeriodEnd) return input;
  const suggested = suggestNonPrescribedPeriod(input);
  return suggested
    ? { ...input, nonPrescribedPeriodStart: suggested.start, nonPrescribedPeriodEnd: suggested.end }
    : input;
};

// The perícia date becomes the case's perícia appointment on the agenda (AD-160, AD-169), at registration
// and when editing; without a date there is none (PSV-03).
const scheduleInspection = (tenantId: string, legalCase: CaseRecord, inspection?: CaseInspection): void => {
  if (!inspection?.date || !inspection.time) return;
  domainEventBus.emit('agenda:entries_synced', {
    tenantId,
    source: 'case',
    originId: legalCase.id,
    caseId: legalCase.id,
    entries: [],
    inspection: {
      title: `Perícia — ${caseLabel(legalCase)}`,
      date: inspection.date,
      time: inspection.time,
      location: inspection.location,
    },
  });
};

// Fee fixed by the court or contracted (technical assistant, AD-135, or the office's own type, AD-176)
// becomes receivable income in finance; the payment given at registration becomes its receipt.
const postFees = (tenantId: string, legalCase: CaseRecord, received?: CasePayment): void => {
  if (!legalCase.fixedFeesCents) return;
  domainEventBus.emit('case:fixed_fees', {
    tenantId,
    caseId: legalCase.id,
    caseLabel: caseLabel(legalCase),
    amountCents: legalCase.fixedFeesCents,
    category: usesContractor(legalCase) ? 'contracted_fees' : 'fixed_fees',
    received,
  });
};

// Single creation path (form, PDF, CSV): resolves the parties in the
// registry (AD-117); the report due date becomes the "Entrega do laudo" deadline by `case:created` (AD-264).
export const createCase = async (data: CreateCaseInput): Promise<CaseRecord> => {
  const { reportDueDate, parties, inspection, payment, ...input } = withSuggestedPeriod(data);
  if (!validClient({ serviceType: input.serviceType, parties }))
    throw new CustomError('invalid_contracting_party', 422);
  if (!validServiceType(input)) throw new CustomError('invalid_service_type', 422);
  if (input.serviceOrder && (await serviceOrderRepository.isRetired(input.tenant, input.serviceOrder))) {
    throw new CustomError('service_order_taken', 409);
  }
  try {
    const legalCase = await caseRepository.createCase({
      ...input,
      // Only a perícia has a sphere (AD-178); a new service starts at the first phase of its type.
      courtType: usesContractor(input) ? undefined : input.courtType,
      phase: input.phase ?? defaultPhase(input.serviceType),
      // Without the labor block (PSV-02), the perícia location is the case location ([LOCAL_PERICIA]).
      location: input.location ?? inspection?.location,
      serviceOrder: input.serviceOrder ?? (await nextServiceOrder(input.tenant)),
      parties: await partyService.resolveParties(input.tenant, parties ?? []),
    });
    // Partnership and private service deliver a service, not necessarily a report (AD-176).
    const own = legalCase.serviceType === 'partnership' || legalCase.serviceType === 'private_service';
    domainEventBus.emit('case:created', {
      tenantId: input.tenant,
      caseId: legalCase.id,
      delivery: reportDueDate
        ? {
            title: own ? SERVICE_DELIVERY_TITLE : REPORT_DELIVERY_TITLE,
            dueDate: reportDueDate,
            notes: own
              ? 'Gerado a partir da data de entrega informada no cadastro.'
              : 'Gerado a partir do prazo do laudo informado no cadastro.',
          }
        : undefined,
    });
    scheduleInspection(input.tenant, legalCase, inspection);
    if (legalCase.fixedFeesCents) postFees(input.tenant, legalCase, payment);
    return legalCase;
  } catch (e) {
    if (isDuplicateKeyError(e)) throw duplicateError(e);
    throw e;
  }
};

export const getCase = async (tenantId: string, id: string): Promise<CaseRecord> => {
  const legalCase = await caseRepository.findById(tenantId, id);
  if (!legalCase) throw new CustomError('not_found', 404);
  return legalCase;
};

export const updateCase = async (tenantId: string, id: string, data: UpdateCase): Promise<CaseRecord> => {
  const before = await getCase(tenantId, id);
  const { parties, inspection, ...rest } = data;
  const serviceType = rest.serviceType ?? before.serviceType;
  if (!validClient({ serviceType, parties: parties ?? before.parties })) {
    throw new CustomError('invalid_contracting_party', 422);
  }
  // `null` clears; missing keeps what was saved.
  const next = <T>(value: T | null | undefined, previous: T | undefined) =>
    value === null ? undefined : (value ?? previous);
  const contracted = usesContractor({ serviceType });
  // Each type keeps only its fields (AD-178): the sphere in a perícia, the contractor in the other types.
  const final = {
    serviceType,
    courtType: contracted ? undefined : next(rest.courtType, before.courtType),
    processNumber: rest.processNumber ?? before.processNumber,
    court: rest.court ?? before.court,
    phase: rest.phase ?? before.phase,
    contractor: contracted ? next(rest.contractor, before.contractor) : undefined,
  };
  if (!validServiceType(final)) throw new CustomError('invalid_service_type', 422);
  if (
    rest.serviceOrder &&
    rest.serviceOrder !== before.serviceOrder &&
    (await serviceOrderRepository.isRetired(tenantId, rest.serviceOrder))
  ) {
    throw new CustomError('service_order_taken', 409);
  }
  const unsetWhenGone = <T>(value: T | undefined, previous: unknown) => value ?? (previous ? null : undefined);
  const updated = await caseRepository
    .updateCase(tenantId, id, {
      ...rest,
      courtType: unsetWhenGone(final.courtType, before.courtType),
      contractor: unsetWhenGone(final.contractor, before.contractor),
      parties: parties ? await partyService.resolveParties(tenantId, parties) : undefined,
    })
    .catch((e: unknown) => {
      throw isDuplicateKeyError(e) ? duplicateError(e) : e;
    });
  if (!updated) throw new CustomError('not_found', 404);
  // Fee fixed by the court or contracted by the assistant (AD-135), new or changed,
  // becomes receivable income in finance.
  if (updated.fixedFeesCents && updated.fixedFeesCents !== before.fixedFeesCents) postFees(tenantId, updated);
  scheduleInspection(tenantId, updated, inspection);
  return updated;
};

// Deleting is an admin action (case.router.ts) and keeps its service order number used; the reports, the
// notifications and the agenda entries leave through `case:deleted` (AD-126, AD-169, AD-264). Appointments and transactions
// that point to it lose the link: a missing reference becomes a missing field.
export const deleteCase = async (tenantId: string, id: string, storage?: FileStorage): Promise<void> => {
  const legalCase = await getCase(tenantId, id);
  const attachments = await caseRepository.listAttachments(tenantId, id);
  // Its number stays used for good (AD-187).
  if (legalCase.serviceOrder) await serviceOrderRepository.retire(tenantId, legalCase.serviceOrder);
  const { deletedCount } = await caseRepository.deleteCase(tenantId, id);
  if (deletedCount === 0) throw new CustomError('not_found', 404);
  await Promise.all(attachments.map((attachment) => releaseAttachment(storage, tenantId, attachment)));
  domainEventBus.emit('case:deleted', { tenantId, caseId: id });
};

// The file leaves the storage and its space goes back to the tenant quota (AD-120).
const releaseAttachment = async (
  storage: FileStorage | undefined,
  tenantId: string,
  { key, bytes }: { key: string; bytes: number },
): Promise<void> => {
  await storage?.remove(key);
  await officeService.returnFile(tenantId, bytes);
};

// SPA-03: file in the storage with the quota reserved first (AD-120).
export const addAttachment = async (
  storage: FileStorage | undefined,
  tenantId: string,
  id: string,
  name: string,
  mime: string,
  body: Buffer,
): Promise<CaseRecord> => {
  if (!storage) throw new CustomError('storage_not_configured', 503);
  const { attachments } = await getCase(tenantId, id);
  if (attachments.length >= CASE_ATTACHMENT_LIMIT.maxByCase) throw new CustomError('attachment_limit_reached', 422);
  const key = `tenants/${tenantId}/expert-cases/${id}/${randomUUID()}`;
  await officeService.reserveFile(tenantId, body.length);
  try {
    await storage.put(key, body, mime);
    const updated = await caseRepository.addAttachment(tenantId, id, { key, name, mime, bytes: body.length });
    if (!updated) throw new CustomError('not_found', 404);
    return updated;
  } catch (error) {
    await releaseAttachment(storage, tenantId, { key, bytes: body.length });
    throw error;
  }
};

const findAttachment = async (tenantId: string, id: string, attachmentId: string) => {
  const attachments = await caseRepository.listAttachments(tenantId, id);
  const attachment = attachments.find((item) => item._id.toString() === attachmentId);
  if (!attachment) throw new CustomError('not_found', 404);
  return attachment;
};

export const getAttachment = async (
  storage: FileStorage | undefined,
  tenantId: string,
  id: string,
  attachmentId: string,
) => {
  const { key, name, mime } = await findAttachment(tenantId, id, attachmentId);
  const body = await storage?.get(key);
  if (!body) throw new CustomError('not_found', 404);
  return { body, name, mime };
};

export const deleteAttachment = async (
  storage: FileStorage | undefined,
  tenantId: string,
  id: string,
  attachmentId: string,
): Promise<void> => {
  const attachment = await findAttachment(tenantId, id, attachmentId);
  await caseRepository.removeAttachment(tenantId, id, attachmentId);
  await releaseAttachment(storage, tenantId, attachment);
};

export const listCases = async (
  tenantId: string,
  query: ListCasesQuery,
): Promise<{ items: CaseListItem[]; total: number }> => {
  try {
    const { deliveryFrom: from, deliveryTo: to } = query;
    const ids =
      from || to
        ? await caseIdsDueBetween(tenantId, [REPORT_DELIVERY_TITLE, SERVICE_DELIVERY_TITLE], { from, to })
        : undefined;
    const result = await caseRepository.listCases(tenantId, query, ids);
    const upcoming = await nextDueByCases(
      tenantId,
      result.items.map((item) => item.id),
    );
    return {
      ...result,
      items: result.items.map((item) => {
        const nextDue = upcoming.get(item.id);
        return nextDue ? { ...item, nextDue } : item;
      }),
    };
  } catch (error) {
    // Database without Atlas Search: explicit error, never silent regex (AD-054).
    if (error instanceof TextSearchUnavailableError) throw new CustomError('search_unavailable', 503);
    throw error;
  }
};

export const addMovement = async (tenantId: string, id: string, data: CreateMovement): Promise<CaseRecord> => {
  const updated = await caseRepository.addMovement(tenantId, id, data);
  if (!updated) throw new CustomError('not_found', 404);
  return updated;
};

export const removeMovement = async (tenantId: string, id: string, movementId: string): Promise<CaseRecord> => {
  const updated = await caseRepository.removeMovement(tenantId, id, movementId);
  if (!updated) throw new CustomError('not_found', 404);
  return updated;
};

const DAY_MS = 86_400_000;
const daysBetween = (de: string, ate: string): number =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DAY_MS);

// DOC-03: open with no movement for more than CASE_STALLED_DAYS days (AD-121).
export const listStalled = async (tenantId: string, now: Date = new Date()): Promise<StalledCase[]> => {
  const today = dateInDisplayTz(now);
  const limit = new Date(Date.parse(`${today}T12:00:00Z`) - STALLED_CASE_DAYS * DAY_MS).toISOString().slice(0, 10);
  const stalled = await caseRepository.listStalled(tenantId, limit);
  return stalled.map((stalled) => ({ ...stalled, stalledDays: daysBetween(stalled.reference, today) }));
};

// Home "Stalled cases" block (GES-05): the total and the oldest ones, same rule as the PDF.
const STALLED_IN_START = 5;
export const stalledSummary = async (tenantId: string): Promise<{ total: number; items: StalledCase[] }> => {
  const stalled = await listStalled(tenantId);
  return { total: stalled.length, items: stalled.slice(0, STALLED_IN_START) };
};

export const listForExport = (tenantId: string) => caseRepository.listAll(tenantId);

export const caseStats = (tenantId: string) => caseRepository.stats(tenantId, DUE_SOON_DAYS);
export const caseDistribution = (tenantId: string) => caseRepository.distribution(tenantId);
// Services of the last 25 months up to the current one (DSH-04): two 12-month periods of complete months for the
// Dashboard's comparison, plus the month in progress (AD-255).
export const caseDashboard = (tenantId: string, now: Date = new Date()) => {
  const month = dateInDisplayTz(now).slice(0, 7);
  return caseRepository.dashboard(
    tenantId,
    Array.from({ length: 25 }, (_, index) => shiftMonth(month, index - 24)),
  );
};
export const findSummariesByIds = (tenantId: string, ids: string[]) => caseRepository.findSummariesByIds(tenantId, ids);

// The cases of the office the worker follows in court (PAC-03): the same rule the worker uses.
export const listTrackedCasesOf = (tenantId: string, now = new Date()) => listTrackedCases(now, tenantId);
