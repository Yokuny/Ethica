import type { CourtType } from './case.schema.js';

// The process in court (Datajud, CNJ), shared by the worker that reads it and the screens that show it
// (AD-271). Public data, the same for every office; never a secret process, never the parties.

// NNNNNNN-DD.AAAA.J.TR.OOOO: J is the court branch segment, TR the court.
// TR code of the state courts, in order: 01 = AC … 27 = TO.
const STATE_BY_COURT = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SE SP TO'.split(' ');

export const courtUnitFromNumber = (number: string): { courtType: CourtType; court: string } | undefined => {
  const [, j, tr] = number.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/) ?? [];
  const code = Number(tr);
  if (j === '5' && code >= 1 && code <= 24) return { courtType: 'labor', court: `TRT${code}` };
  if (j === '4' && code >= 1 && code <= 6) return { courtType: 'federal', court: `TRF${code}` };
  const uf = STATE_BY_COURT[code - 1];
  if (j === '8' && uf) return { courtType: 'civil', court: `TJ${uf}` };
  return undefined;
};

// AD-277: the state courts (TJ) refused every Datajud query in 2026-11-22; the tracking starts with the labor
// (TRT) and federal (TRF) ones and the civil enter when a TJ fixture is recorded.
export const TRACKED_COURT_TYPES: readonly CourtType[] = ['labor', 'federal'];

// Whether the case number belongs to a court the automation follows today.
export const isTrackedNumber = (number?: string): boolean => {
  const unit = number ? courtUnitFromNumber(number) : undefined;
  return Boolean(unit && TRACKED_COURT_TYPES.includes(unit.courtType));
};

// Datajud index of a court: `TRT2` → `api_publica_trt2`.
export const datajudIndexOf = (court: string): string => `api_publica_${court.toLowerCase()}`;

// The Datajud keeps only the digits; the cases keep the CNJ mask.
export const cnjDigits = (number: string): string => number.replace(/\D/g, '');
export const formatCnjNumber = (digits: string): string => {
  const d = cnjDigits(digits);
  if (d.length !== 20) return digits;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
};

// One movement of the process in court (`courtMovement`, glossary): TPU code, name, instant and tabled complements.
export type CourtMovement = {
  key: string;
  code: number;
  name: string;
  at: string;
  complements: { code?: number; description?: string; value?: number; name?: string }[];
};

// What the case screen shows of the process in court (the timeline, newest first).
export type CourtProcessView = {
  court: string;
  processNumber: string;
  className?: string;
  courtUnitName?: string;
  sourceUpdatedAt?: string;
  fetchedAt?: string;
  movements: CourtMovement[];
};

// What the court gives to fill a case by its number (SGD-06): sphere and court come from the number itself; the
// division, the filing day and the subjects from the Datajud.
export type CourtLookup = {
  courtType: CourtType;
  court: string;
  division?: string;
  docketingDate?: string;
  subject?: string;
};

// A case the automation follows (the Automação page, PAC-02): waiting for the first successful query, queried and
// not found in court, or synced; `syncedAt` is the last successful query (absent while waiting).
export type TrackedCaseStatus = 'waiting' | 'not_found' | 'synced';
export type TrackedCase = {
  caseId: string;
  caseLabel: string;
  court: string;
  status: TrackedCaseStatus;
  syncedAt?: string;
};

// What happened to a suggestion of the automation (the Automação panel, PAT-05).
export type SuggestionOutcome = 'accepted' | 'rejected' | 'expired' | 'superseded' | 'pending';

// The Automação panel (PAT-01, PAT-04, PAT-05): 25 months, oldest to the current one (two 12-month periods of complete
// months plus the month in progress, as in the Dashboard). Movements, notices and run days come from the day record
// (`CourtSyncDay`), so they start on the day it was first written (`since`); suggestions come from the notifications.
export type AutomationMonth = {
  month: string;
  movements: number;
  notices: number;
  // Days with a run and, of those, the days every case of the run got an answer from the court.
  roundDays: number;
  completeDays: number;
  suggestions: number;
  byStatus: Partial<Record<SuggestionOutcome, number>>;
};
export type AutomationDashboard = {
  since?: string;
  tracked: { total: number; byState: Record<TrackedCaseStatus, number> };
  // Suggestions waiting for approval, of the modules the person sees: the same number as the Central.
  pending: number;
  byMonth: AutomationMonth[];
};
