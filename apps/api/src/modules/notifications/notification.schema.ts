import type {
  CreateNotification,
  DatedNotificationRecord,
  NotificationRecord,
  UpdateNotification,
} from '@ethica/contracts';
import {
  calendarDateSchema,
  createNotificationSchema,
  idSchema,
  NOTIFICATION_KINDS,
  NOTIFICATION_STATES,
  updateNotificationSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CreateNotification, UpdateNotification };
export { createNotificationSchema, updateNotificationSchema };

export type NotificationRouterDeps = { validToken: RequestHandler };

export const notificationIdParamSchema = z.object({ id: idSchema }).strict();

// One list for every kind (AD-282): the open ones by default; `kind` and `caseId` narrow it. With `caseId` and no
// state, every one of the case (its detail).
export const listNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    state: z.enum(NOTIFICATION_STATES).optional(),
    kind: z.enum(NOTIFICATION_KINDS).optional(),
    caseId: idSchema.optional(),
  })
  .strict();
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

// Accepting a receipt (AD-269) asks the open income of the case and the confirmed amount, date and account;
// the other suggestions take no body.
export const acceptSuggestionSchema = z
  .object({
    transactionId: idSchema.optional(),
    amountCents: z.number().int().min(1).optional(),
    date: calendarDateSchema.optional(),
    account: z.string().trim().max(120).optional(),
  })
  .strict();
export type AcceptSuggestion = z.infer<typeof acceptSuggestionSchema>;

// Rejecting keeps the reason: the quality of each rule (plan, section 5).
export const rejectSuggestionSchema = z
  .object({ reason: z.string().trim().max(300, 'motivo inválido').optional() })
  .strict();
export type RejectSuggestion = z.infer<typeof rejectSuggestionSchema>;

export type { DatedNotificationRecord as DatedNotification, NotificationRecord };

// A suggestion always has case, proposal, evidence, rule and status (AD-268).
export type SuggestionRecord = NotificationRecord &
  Required<Pick<NotificationRecord, 'caseId' | 'proposal' | 'evidence' | 'ruleKey' | 'status'>>;

// `filedDate: null` clears the date (the deadline went back to pending or was missed).
export type NotificationWrite = Omit<UpdateNotification, 'filedDate'> & { filedDate?: string | null };
