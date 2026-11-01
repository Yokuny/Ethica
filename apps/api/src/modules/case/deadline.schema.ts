import type { CreateDeadline, DeadlineStatus, UpdateDeadline } from '@ethica/contracts';
import { calendarDateSchema, createDeadlineSchema, idSchema, updateDeadlineSchema } from '@ethica/contracts';
import { z } from 'zod';

export type { CreateDeadline, UpdateDeadline };
export { createDeadlineSchema, updateDeadlineSchema };

// Deadline created from the registration `reportDeadline` (AD-109) and filed when the report is completed (AD-126).
export const REPORT_DELIVERY_DEADLINE = 'Entrega do laudo';

export const deadlineIdParamSchema = z.object({ deadlineId: idSchema }).strict();

// Agenda calendar: pending deadlines due in [from, to) (display time zone dates).
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
  // Enriched by the service; missing if the case no longer exists.
  caseNumber?: string;
  title: string;
  dueDate: string;
  status: DeadlineStatus;
  filedDate?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

// `filedDate: null` clears the date (the deadline went back to pending or was missed).
export type DeadlineWrite = Omit<UpdateDeadline, 'filedDate'> & { filedDate?: string | null };

// Pending deadline of a reminder day, with the tenant (system query, across tenants).
export type NoticeDeadline = DeadlineRecord & { tenantId: string };

export type NextDeadline = { title: string; dueDate: string };
