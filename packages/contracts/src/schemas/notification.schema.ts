import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

// Everything that asks for someone's attention in the office (AD-263): a deadline (filed with the
// date it was delivered, or missed), an alert (a dated reminder that is concluded), a suggestion of
// the Datajud automation (only applied when someone accepts it, AD-268) and a notice (read per person).
export const NOTIFICATION_KINDS = ['deadline', 'alert', 'suggestion', 'notice'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_STATUS = [
  'pending',
  'filed',
  'missed',
  'done',
  'canceled',
  'accepted',
  'rejected',
  'superseded',
  'expired',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[number];

// A notice has no status: it is read or unread per person.
const STATUS_OF_KIND: Record<NotificationKind, readonly NotificationStatus[]> = {
  deadline: ['pending', 'filed', 'missed', 'canceled'],
  alert: ['pending', 'done', 'canceled'],
  suggestion: ['pending', 'accepted', 'rejected', 'superseded', 'expired'],
  notice: [],
};
export const validNotificationStatus = (kind: NotificationKind, status: NotificationStatus): boolean =>
  STATUS_OF_KIND[kind].includes(status);

// What a person creates by hand: a deadline or an alert.
export const USER_NOTIFICATION_KINDS = ['deadline', 'alert'] as const;
export type UserNotificationKind = (typeof USER_NOTIFICATION_KINDS)[number];

// Who sees it (AD-137): the list and the counter follow the module the person can view.
export const NOTIFICATION_MODULES = ['expert_cases', 'finance'] as const;
export type NotificationModule = (typeof NOTIFICATION_MODULES)[number];

export const NOTIFICATION_SOURCES = ['user', 'system', 'datajud'] as const;
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

// "Due soon" (defined by the user on 2026-10-31).
export const DUE_SOON_DAYS = 15;

// A deadline created from the registration report due date (AD-264) and filed when the report is completed (AD-126).
export const REPORT_DELIVERY_TITLE = 'Entrega do laudo';
// Delivery date of a service of the office's own type (AD-176).
export const SERVICE_DELIVERY_TITLE = 'Entrega do serviço';

const notificationFields = z.object({
  title: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
  dueDate: calendarDateSchema,
  notes: z.string().trim().max(1000, 'observações inválidas').optional(),
});

// The kind is chosen at creation only; without it, a deadline.
export const createNotificationSchema = notificationFields
  .extend({ caseId: idSchema, kind: z.enum(USER_NOTIFICATION_KINDS).optional() })
  .strict();
export type CreateNotification = z.infer<typeof createNotificationSchema>;

// Filing without a date saves today; going back to pending/missed clears the date.
export const updateNotificationSchema = notificationFields
  .partial()
  .extend({ status: z.enum(NOTIFICATION_STATUS).optional(), filedDate: calendarDateSchema.optional() })
  .strict();
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
