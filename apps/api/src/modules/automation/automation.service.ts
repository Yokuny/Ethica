import {
  courtDivisionName,
  courtUnitFromNumber,
  hasPermission,
  isTrackedNumber,
  type Permissions,
  type TrackedCaseStatus,
} from '@ethica/contracts';
import { dateInDisplayTz, shiftMonth, wallClockToUtc } from '@ethica/db';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as notificationService from '../notifications/notification.service.js';
import * as automationRepository from './automation.repository.js';
import type {
  AutomationDashboard,
  CourtLookup,
  CourtProcessView,
  DatajudClient,
  ListTrackedCasesQuery,
  TrackedCase,
  TrackedCasesList,
} from './automation.schema.js';

// Automação Datajud (AD-268 to AD-271): the BFF reads what the worker brought from the court; the live lookup by
// number (SGD-06, AD-304) is the only call it makes to the Datajud.

// Timeline of the case in court; null while the worker has not brought it yet (or the number has no court).
export const getCaseCourtProcess = async (tenantId: string, caseId: string): Promise<CourtProcessView | null> => {
  const legalCase = await caseService.getCase(tenantId, caseId);
  const unit = legalCase.processNumber ? courtUnitFromNumber(legalCase.processNumber) : undefined;
  if (!unit || !legalCase.processNumber) return null;
  return automationRepository.findCourtProcess(unit.court, legalCase.processNumber);
};

// A successful query older than this reads as "no answer from the court" (a weekend with a failed day still fits).
const STALE_MS = 3 * 86_400_000;
// Without a movement to sort by, what needs a look first.
const ATTENTION: Record<TrackedCaseStatus, number> = { not_found: 0, stale: 0, waiting: 1, synced: 2 };

// Every case the worker follows (PAC-01), with what the court answered (PAC-02): no record = waiting for the first
// query; a record without baseline = not found in court; an old last query = stale. A case closed or canceled is not
// followed, so not listed.
const trackedCasesOf = async (tenantId: string, now: Date): Promise<TrackedCase[]> => {
  const tracked = await caseService.listTrackedCasesOf(tenantId, now);
  const syncs = await automationRepository.findCourtSyncs(
    tenantId,
    tracked.map((item) => item.caseId),
  );
  return tracked.map((item): TrackedCase => {
    const sync = syncs.get(item.caseId);
    const base = { caseId: item.caseId, caseLabel: item.processNumber, court: item.court };
    if (!sync) return { ...base, status: 'waiting' };
    const { found, ...rest } = sync;
    const stale = now.getTime() - new Date(sync.syncedAt).getTime() > STALE_MS;
    return { ...base, ...rest, status: stale ? 'stale' : found ? 'synced' : 'not_found' };
  });
};

// The list of the Automação page (PAT-03), filtered, sorted and paginated here: an office follows hundreds of cases
// at most, and who is followed is a rule on the number (`courtUnitFromNumber`), not a query. A case without the
// sorted value goes last, by attention; the case id breaks every tie so the pages are stable.
export const listTrackedCases = async (
  tenantId: string,
  query: ListTrackedCasesQuery,
  now = new Date(),
): Promise<TrackedCasesList> => {
  const digits = query.q?.replace(/\D/g, '');
  const order = query.order === 'asc' ? 1 : -1;
  const value = (item: TrackedCase) => item[query.sort] ?? '';
  const items = (await trackedCasesOf(tenantId, now))
    .filter((item) => !digits || item.caseLabel.replace(/\D/g, '').includes(digits))
    .filter((item) => !query.state || query.state.includes(item.status))
    .sort((a, b) => {
      const [left, right] = [value(a), value(b)];
      if (!left || !right) {
        if (left || right) return left ? -1 : 1;
        return ATTENTION[a.status] - ATTENTION[b.status] || a.caseId.localeCompare(b.caseId);
      }
      return order * left.localeCompare(right) || a.caseId.localeCompare(b.caseId);
    });
  const start = (query.page - 1) * query.limit;
  return { items: items.slice(start, start + query.limit), total: items.length };
};

const sum = <T>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);

// The Automação panel (PAT-01, PAT-04, PAT-05): what is tracked now, what waits for approval and, month by month over
// 25 months, what the daily query did (day record) and the suggestions it made. Finance notices and suggestions only
// for whoever sees Finance (AD-137).
export const automationDashboard = async (
  tenantId: string,
  permissions: Permissions,
  now = new Date(),
): Promise<AutomationDashboard> => {
  const current = dateInDisplayTz(now).slice(0, 7);
  const months = Array.from({ length: 25 }, (_, index) => shiftMonth(current, index - 24));
  const [tracked, days, suggestions] = await Promise.all([
    trackedCasesOf(tenantId, now),
    automationRepository.findSyncDays(tenantId, `${months[0]}-01`),
    notificationService.suggestionActivity(tenantId, permissions, wallClockToUtc(`${months[0]}-01`, '00:00')),
  ]);
  const seesFinance = hasPermission(permissions, 'finance', 'view');
  const byState: Record<TrackedCaseStatus, number> = { synced: 0, not_found: 0, stale: 0, waiting: 0 };
  for (const item of tracked) byState[item.status] += 1;
  return {
    since: days[0]?.day,
    tracked: { total: tracked.length, byState },
    pending: suggestions.pending,
    byMonth: months.map((month) => {
      const ofMonth = days.filter((row) => row.day.startsWith(month));
      const outcomes = suggestions.byMonth.filter((row) => row.month === month);
      return {
        month,
        movements: sum(ofMonth, (row) => row.newMovements),
        notices: sum(ofMonth, (row) => row.notices.expert_cases + (seesFinance ? row.notices.finance : 0)),
        roundDays: ofMonth.length,
        completeDays: ofMonth.filter((row) => row.tracked > 0 && row.answered >= row.tracked).length,
        suggestions: sum(outcomes, (row) => row.count),
        byStatus: Object.fromEntries(outcomes.map((row) => [row.status, row.count])),
      };
    }),
  };
};

// Fill a case by its number, live (SGD-06): the copy fetched today when there is one, otherwise one call to the
// Datajud (no retries: the worker retries in its daily run). Not found and secret are one answer (the client drops a
// secret process, AD-271); a court that does not answer is `court_unavailable`.
export const lookupCourtProcess = async (
  processNumber: string,
  datajud: DatajudClient | undefined,
  now = new Date(),
): Promise<CourtLookup> => {
  const unit = courtUnitFromNumber(processNumber);
  if (!unit || !isTrackedNumber(processNumber)) throw new CustomError('court_process_not_found', 404);
  let found = await automationRepository.findCourtFill(unit.court, processNumber);
  if (!found || dateInDisplayTz(found.fetchedAt) !== dateInDisplayTz(now)) {
    if (!datajud) throw new CustomError('court_unavailable', 503);
    let processes: Awaited<ReturnType<DatajudClient['fetchProcesses']>>;
    try {
      processes = await datajud.fetchProcesses(unit.court, [processNumber]);
    } catch {
      // The client already logged the call (`datajud.request`, AD-287).
      throw new CustomError('court_unavailable', 503);
    }
    if (processes.length === 0) throw new CustomError('court_process_not_found', 404);
    await automationRepository.saveCourtProcesses(processes, now);
    found = await automationRepository.findCourtFill(unit.court, processNumber);
  }
  if (!found) throw new CustomError('court_process_not_found', 404);
  return {
    ...unit,
    ...(found.courtUnitName ? { division: courtDivisionName(found.courtUnitName) } : {}),
    ...(found.filedAt ? { docketingDate: found.filedAt } : {}),
    ...(found.subjects.length > 0 ? { subject: found.subjects.join(', ') } : {}),
  };
};
