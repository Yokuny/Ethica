import type {
  CaseRole,
  CourtType,
  CreateNotification,
  NotificationKind,
  NotificationModule,
  NotificationSource,
  NotificationStatus,
  UpdateNotification,
} from '@ethica/contracts';
import { createNotificationSchema, idSchema, NOTIFICATION_STATUS, updateNotificationSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CreateNotification, UpdateNotification };
export { createNotificationSchema, updateNotificationSchema };

export type NotificationRouterDeps = { validToken: RequestHandler };

export const notificationIdParamSchema = z.object({ id: idSchema }).strict();

// Central (AD-263): one situation at a time, the pending ones by default; with `caseId`, every one of the
// case (its detail), unless a situation is asked.
export const listNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(NOTIFICATION_STATUS).optional(),
    caseId: idSchema.optional(),
  })
  .strict();
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

// Notices of the bell (CNT-04): unread first is the person's choice; newest first.
export const listNoticesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    unread: z.enum(['true', 'false']).optional(),
  })
  .strict();
export type ListNoticesQuery = z.infer<typeof listNoticesQuerySchema>;

export type NoticeRecord = {
  id: string;
  module: NotificationModule;
  topic?: string;
  params?: Record<string, string | number>;
  severity?: string;
  caseId?: string;
  transactionId?: string;
  read: boolean;
  createdAt: Date;
};

export type NotificationRecord = {
  id: string;
  kind: NotificationKind;
  module: NotificationModule;
  source: NotificationSource;
  status?: NotificationStatus;
  caseId?: string;
  // Enriched by the service; missing if the case no longer exists.
  caseNumber?: string;
  client?: string;
  plaintiff?: string;
  defendant?: string;
  role?: CaseRole;
  serviceType?: string;
  courtType?: CourtType;
  title?: string;
  dueDate?: string;
  filedDate?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

// A deadline or an alert: always with case, title, due date and status (the model guarantees it).
export type DatedNotification = NotificationRecord & {
  caseId: string;
  title: string;
  dueDate: string;
  status: NotificationStatus;
};

// `filedDate: null` clears the date (the deadline went back to pending or was missed).
export type NotificationWrite = Omit<UpdateNotification, 'filedDate'> & { filedDate?: string | null };
