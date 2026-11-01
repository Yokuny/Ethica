import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from './case.service.js';
import type { ListPendingDeadlinesQuery } from './deadline.schema.js';
import * as deadlineService from './deadline.service.js';
import { DeadlineNotFoundError } from './deadline.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// Deadline or case missing (or from another tenant) -> 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof DeadlineNotFoundError || e instanceof CaseNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createDeadline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await deadlineService.createDeadline(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listCaseDeadlines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await deadlineService.listCaseDeadlines(tenantOf(req), req.params.id as string) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listPendingDeadlines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListPendingDeadlinesQuery;
    res.json(respObj({ data: await deadlineService.listPendingDeadlines(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const updateDeadline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await deadlineService.updateDeadline(tenantOf(req), req.params.deadlineId as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteDeadline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deadlineService.deleteDeadline(tenantOf(req), req.params.deadlineId as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
