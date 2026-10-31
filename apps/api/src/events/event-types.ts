// AD-039: eventos de domínio in-process. Só efeitos colaterais cujo resultado a
// resposta HTTP não usa viram evento — fire-and-forget.
export interface PericiaHonorariosFixadosPayload {
  tenantId: string;
  periciaId: string;
  numeroProcesso: string;
  valorCents: number;
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
