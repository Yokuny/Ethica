import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import * as pushService from './push.service.js';

export const saveSubscription = async (req: Request, res: Response): Promise<void> => {
  await pushService.saveSubscription(req.tenantUser.tenant as string, req.tenantUser.user, req.body);
  res.status(201).json(respObj({}));
};

export const removeSubscription = async (req: Request, res: Response): Promise<void> => {
  await pushService.removeSubscription(req.tenantUser.user, String(req.query.endpoint));
  res.json(respObj({}));
};
