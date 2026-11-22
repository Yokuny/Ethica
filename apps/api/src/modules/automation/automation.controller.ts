import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import * as automationService from './automation.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// The module is checked before anything else (AD-276).
export const requireAutomation = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    await automationService.ensureAutomation(tenantOf(req));
    next();
  } catch (e) {
    next(e);
  }
};

export const getCaseCourtProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await automationService.getCaseCourtProcess(tenantOf(req), req.params.id as string);
    res.json(respObj({ data }));
  } catch (e) {
    next(e instanceof CaseNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
  }
};
