import type { CreateDeadline, DeadlineStatus, UpdateDeadline } from '@ethica/contracts';
import { calendarDateSchema, createDeadlineSchema, idSchema, updateDeadlineSchema } from '@ethica/contracts';
import { z } from 'zod';

export type { CreateDeadline, UpdateDeadline };
export { createDeadlineSchema, updateDeadlineSchema };

// Prazo criado pelo `prazoLaudo` do cadastro (AD-109) e protocolado ao concluir o laudo (AD-126).
export const REPORT_DELIVERY_DEADLINE = 'Entrega do laudo';

export const deadlineIdParamSchema = z.object({ deadlineId: idSchema }).strict();

// Calendário da agenda: prazos pendentes que vencem em [from, to) (datas do fuso de exibição).
export const listPendingDeadlinesQuerySchema = z
  .object({ from: calendarDateSchema.optional(), to: calendarDateSchema.optional() })
  .strict()
  .refine((query) => !query.from || !query.to || query.from < query.to, {
    message: 'from precisa ser antes de to',
    path: ['to'],
  });
export type ListPendingDeadlinesQuery = z.infer<typeof listPendingDeadlinesQuerySchema>;

export type DeadlineRecord = {
  id: string;
  caseId: string;
  // Enriquecido pelo service; ausente se a perícia não existe mais.
  caseNumber?: string;
  title: string;
  dueDate: string;
  status: DeadlineStatus;
  filedDate?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

// `protocoladoEm: null` apaga a data (prazo voltou a pendente ou foi perdido).
export type DeadlineWrite = Omit<UpdateDeadline, 'filedDate'> & { filedDate?: string | null };

// Prazo pendente de um dia do aviso, com o tenant (consulta do sistema, entre tenants).
export type NoticeDeadline = DeadlineRecord & { tenantId: string };

export type NextDeadline = { title: string; dueDate: string };
