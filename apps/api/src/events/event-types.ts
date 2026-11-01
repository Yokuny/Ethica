// AD-039: eventos de domínio in-process. Só efeitos colaterais cujo resultado a
// resposta HTTP não usa viram evento — fire-and-forget.
export interface CaseFixedFeesPayload {
  tenantId: string;
  caseId: string;
  processNumber: string;
  amountCents: number;
  // Fixado pelo juízo ou contratado pela parte que contratou o assistente técnico (AD-135).
  category: 'fixed_fees' | 'contracted_fees';
}

// Perícia excluída: quem guarda dado ligado a ela (laudos, AD-126) apaga o seu.
export interface CaseDeletedPayload {
  tenantId: string;
  caseId: string;
}

export type DomainEventMap = {
  'case:fixed_fees': CaseFixedFeesPayload;
  'case:deleted': CaseDeletedPayload;
};

export type DomainEventName = keyof DomainEventMap;
