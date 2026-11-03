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
}

// Case deleted: whoever keeps data linked to it (reports, AD-126) deletes its own.
export interface CaseDeletedPayload {
  tenantId: string;
  caseId: string;
}

// Perícia date given at registration (AD-160): the agenda creates the inspection appointment.
export interface CaseInspectionScheduledPayload {
  tenantId: string;
  caseId: string;
  caseLabel: string;
  date: string;
  time: string;
  location?: string;
}

export type DomainEventMap = {
  'case:inspection_scheduled': CaseInspectionScheduledPayload;
  'case:fixed_fees': CaseFixedFeesPayload;
  'case:deleted': CaseDeletedPayload;
};

export type DomainEventName = keyof DomainEventMap;
