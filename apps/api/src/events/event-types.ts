import type { CalendarEntryInput, CalendarEntrySource } from '@ethica/contracts';

// AD-039: in-process domain events. Only side effects whose result the
// HTTP response does not use become events — fire-and-forget.
export interface CaseFixedFeesPayload {
  tenantId: string;
  caseId: string;
  // Process number or, without one, the object (AD-158).
  caseLabel: string;
  amountCents: number;
  // Fixed by the court or contracted by the party that hired the technical assistant (AD-135).
  category: 'fixed_fees' | 'contracted_fees';
  // Payment given at registration (AD-176): a receipt of the income on the payoff date.
  received?: { amountCents: number; date: string };
}

// Case deleted: whoever keeps data linked to it (reports, AD-126) deletes its own.
export interface CaseDeletedPayload {
  tenantId: string;
  caseId: string;
}

// Agenda by events (AD-169): an origin (deadline, transaction, case) sends all its agenda entries on every
// change and the agenda replaces the previous ones (an empty list removes them). `inspection` is the perícia
// date of a case (AD-160, AEV-04): timed, it becomes the case's perícia appointment.
export interface AgendaEntriesSyncedPayload {
  tenantId: string;
  source: CalendarEntrySource | 'case';
  originId: string;
  caseId?: string;
  entries: CalendarEntryInput[];
  inspection?: { title: string; date: string; time: string; location?: string };
}

export type DomainEventMap = {
  'agenda:entries_synced': AgendaEntriesSyncedPayload;
  'case:fixed_fees': CaseFixedFeesPayload;
  'case:deleted': CaseDeletedPayload;
};

export type DomainEventName = keyof DomainEventMap;
