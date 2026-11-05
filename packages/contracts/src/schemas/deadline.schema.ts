import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

// Case procedural deadline (AD-109). `filed` is the deadline met, with the
// date it was delivered; `missed` stays in the history without counting as pending. `done`: an alert
// concluded (AD-189).
export const DEADLINE_STATUS = ['pending', 'filed', 'missed', 'done'] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUS)[number];

// "Prazos e Alertas" (AD-189): a deadline is filed or missed; an alert is a dated reminder that is concluded.
export const DEADLINE_KINDS = ['deadline', 'alert'] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];
const STATUS_OF_KIND: Record<DeadlineKind, readonly DeadlineStatus[]> = {
  deadline: ['pending', 'filed', 'missed'],
  alert: ['pending', 'done'],
};
export const validDeadlineStatus = (kind: DeadlineKind, status: DeadlineStatus): boolean =>
  STATUS_OF_KIND[kind].includes(status);

// "Due soon" (defined by the user on 2026-10-31).
export const DEADLINE_DUE_SOON_DAYS = 15;

const deadlineFields = z.object({
  title: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
  dueDate: calendarDateSchema,
  notes: z.string().trim().max(1000, 'observações inválidas').optional(),
});

// The kind is chosen at creation only; without it, a deadline.
export const createDeadlineSchema = deadlineFields.extend({ kind: z.enum(DEADLINE_KINDS).optional() }).strict();
export type CreateDeadline = z.infer<typeof createDeadlineSchema>;

// Filing without a date saves today; going back to pending/missed clears the date.
export const updateDeadlineSchema = deadlineFields
  .partial()
  .extend({ status: z.enum(DEADLINE_STATUS).optional(), filedDate: calendarDateSchema.optional() })
  .strict();
export type UpdateDeadline = z.infer<typeof updateDeadlineSchema>;
