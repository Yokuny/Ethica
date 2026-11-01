// AD-039: eventos de domínio in-process. Só efeitos colaterais cujo resultado a
// resposta HTTP não usa viram evento — fire-and-forget.
export interface PericiaHonorariosFixadosPayload {
  tenantId: string;
  periciaId: string;
  numeroProcesso: string;
  valorCents: number;
  // Fixado pelo juízo ou contratado pela parte que contratou o assistente técnico (AD-135).
  categoria: 'fixed_fees' | 'contracted_fees';
}

// Perícia excluída: quem guarda dado ligado a ela (laudos, AD-126) apaga o seu.
export interface PericiaDeletedPayload {
  tenantId: string;
  periciaId: string;
}

export type DomainEventMap = {
  'pericia:honorarios_fixados': PericiaHonorariosFixadosPayload;
  'pericia:deleted': PericiaDeletedPayload;
};

export type DomainEventName = keyof DomainEventMap;
