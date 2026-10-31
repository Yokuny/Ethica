import type { CreatePrazo, PrazoStatus, UpdatePrazo } from '@ethica/contracts';
import { calendarDateSchema, createPrazoSchema, idSchema, updatePrazoSchema } from '@ethica/contracts';
import { z } from 'zod';

export type { CreatePrazo, UpdatePrazo };
export { createPrazoSchema, updatePrazoSchema };

export const prazoIdParamSchema = z.object({ prazoId: idSchema }).strict();

// Calendário da agenda: prazos pendentes que vencem em [from, to) (datas do fuso de exibição).
export const listPrazosPendentesQuerySchema = z
  .object({ from: calendarDateSchema.optional(), to: calendarDateSchema.optional() })
  .strict()
  .refine((query) => !query.from || !query.to || query.from < query.to, {
    message: 'from precisa ser antes de to',
    path: ['to'],
  });
export type ListPrazosPendentesQuery = z.infer<typeof listPrazosPendentesQuerySchema>;

export type PrazoRecord = {
  id: string;
  periciaId: string;
  // Enriquecido pelo service; ausente se a perícia não existe mais.
  periciaNumero?: string;
  titulo: string;
  vencimento: string;
  status: PrazoStatus;
  protocoladoEm?: string;
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
};

// `protocoladoEm: null` apaga a data (prazo voltou a pendente ou foi perdido).
export type PrazoWrite = Omit<UpdatePrazo, 'protocoladoEm'> & { protocoladoEm?: string | null };

// Prazo pendente de um dia do aviso, com o tenant (consulta do sistema, entre tenants).
export type PrazoDoAviso = PrazoRecord & { tenantId: string };

export type ProximoPrazo = { titulo: string; vencimento: string };
