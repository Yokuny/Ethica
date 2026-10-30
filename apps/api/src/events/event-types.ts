// AD-039: eventos de domínio in-process. Só efeitos colaterais cujo resultado a
// resposta HTTP não usa viram evento — fire-and-forget.
export interface PericiaCreatedPayload {
  tenantId: string;
  periciaId: string;
  numeroProcesso: string;
  prazoLaudo?: string;
}

export interface PericiaHonorariosFixadosPayload {
  tenantId: string;
  periciaId: string;
  numeroProcesso: string;
  valorCents: number;
}

export type DomainEventMap = {
  'pericia:created': PericiaCreatedPayload;
  'pericia:honorarios_fixados': PericiaHonorariosFixadosPayload;
};

export type DomainEventName = keyof DomainEventMap;
