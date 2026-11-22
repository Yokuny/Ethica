import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { ListNotificationsQuery } from './notification.schema.js';
import * as notificationService from './notification.service.js';
import { NotificationNotFoundError } from './notification.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// Notification or case missing (or from another tenant) -> 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof NotificationNotFoundError || e instanceof CaseNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationService.createNotification(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListNotificationsQuery;
    res.json(respObj({ data: await notificationService.listNotifications(tenantOf(req), query) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const updateNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationService.updateNotification(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificationService.deleteNotification(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
