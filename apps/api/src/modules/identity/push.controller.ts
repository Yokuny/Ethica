import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import * as pushRepository from './push.repository.js';

// AVS-03: the device turns push on (the inscription comes from the browser) and off (also when signing out).
export const saveSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pushRepository.saveSubscription(req.tenantUser.tenant as string, req.tenantUser.user, req.body);
    res.status(201).json(respObj({}));
  } catch (e) {
    next(e);
  }
};

export const removeSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pushRepository.removeSubscription(req.tenantUser.user, String(req.query.endpoint));
    res.json(respObj({}));
  } catch (e) {
    next(e);
  }
};
