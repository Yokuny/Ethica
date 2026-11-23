import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import * as automationService from './automation.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// The module is checked before anything else (AD-276).
export const requireAutomation = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  await automationService.ensureAutomation(tenantOf(req));
  next();
};

export const getCaseCourtProcess = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await automationService.getCaseCourtProcess(tenantOf(req), req.params.id as string) }));
};

export const listTrackedCases = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await automationService.listTrackedCases(tenantOf(req)) }));
};
