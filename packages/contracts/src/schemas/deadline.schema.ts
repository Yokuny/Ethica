import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

// Case procedural deadline (AD-109). `filed` is the deadline met, with the
// date it was delivered; `missed` stays in the history without counting as pending.
export const DEADLINE_STATUS = ['pending', 'filed', 'missed'] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUS)[number];

// "Due soon" (defined by the user on 2026-10-31).
export const DEADLINE_DUE_SOON_DAYS = 15;

const deadlineFields = z.object({
  title: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
  dueDate: calendarDateSchema,
  notes: z.string().trim().max(1000, 'observações inválidas').optional(),
});

export const createDeadlineSchema = deadlineFields.strict();
export type CreateDeadline = z.infer<typeof createDeadlineSchema>;

// Filing without a date saves today; going back to pending/missed clears the date.
export const updateDeadlineSchema = deadlineFields
  .partial()
  .extend({ status: z.enum(DEADLINE_STATUS).optional(), filedDate: calendarDateSchema.optional() })
  .strict();
export type UpdateDeadline = z.infer<typeof updateDeadlineSchema>;
