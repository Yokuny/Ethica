import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { ListNotificationsQuery } from './notification.schema.js';
import * as notificationService from './notification.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
// The person and the permissions come from the session (AD-010, AD-137).
const reader = (req: Request) => ({
  tenantId: tenantOf(req),
  userId: req.tenantUser.user,
  permissions: req.tenantUser.permissions ?? {},
});

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  const result = await notificationService.createNotification(tenantOf(req), req.body);
  res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
};

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListNotificationsQuery;
  res.json(respObj({ data: await notificationService.listNotifications(reader(req), query) }));
};

export const updateNotification = async (req: Request, res: Response): Promise<void> => {
  const result = await notificationService.updateNotification(tenantOf(req), req.params.id as string, req.body);
  res.json(respObj({ data: result }));
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  await notificationService.deleteNotification(tenantOf(req), req.params.id as string);
  res.json(respObj({ message: 'removed_successfully' }));
};

export const countDue = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: { count: await notificationService.countDue(reader(req)) } }));
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  await notificationService.markRead(reader(req), req.params.id as string);
  res.json(respObj({}));
};

export const acceptSuggestion = async (req: Request, res: Response): Promise<void> => {
  const data = await notificationService.acceptSuggestion(reader(req), req.params.id as string, req.body ?? {});
  res.json(respObj({ data }));
};

export const rejectSuggestion = async (req: Request, res: Response): Promise<void> => {
  const data = await notificationService.rejectSuggestion(reader(req), req.params.id as string, req.body);
  res.json(respObj({ data }));
};
