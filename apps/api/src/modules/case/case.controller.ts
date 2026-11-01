import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { ListCasesQuery } from './case.schema.js';
import * as caseService from './case.service.js';
import { CaseNotFoundError } from './case.service.js';
import * as importService from './import.service.js';

// The Tenant always comes from req.tenantUser (AD-010), never from the body/query.
const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof CaseNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

const STALLED_IN_START = 5;

export const createCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await caseService.createCase({ ...req.body, tenant: tenantOf(req) });
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const listCases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await caseService.listCases(tenantOf(req), req.query as unknown as ListCasesQuery);
    res.json(respObj({ data: result }));
  } catch (e) {
    next(e);
  }
};

export const getCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await caseService.getCase(tenantOf(req), req.params.id as string) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const updateCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await caseService.updateCase(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await caseService.deleteCase(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const caseStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await caseService.caseStats(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

export const caseDistribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await caseService.caseDistribution(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

// Home "Stalled cases" block (GES-05): the total and the oldest ones, same rule as the PDF.
export const stalledSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stalled = await caseService.listStalled(tenantOf(req));
    res.json(respObj({ data: { total: stalled.length, items: stalled.slice(0, STALLED_IN_START) } }));
  } catch (e) {
    next(e);
  }
};

// Import (AD-114, AD-118): the file arrives as the body through the router's `fileBody`.
export const importPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await importService.extractPdf(tenantOf(req), req.body) }));
  } catch (e) {
    next(e);
  }
};

export const importCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await importService.importCsv(tenantOf(req), req.body) }));
  } catch (e) {
    next(e);
  }
};

export const addMovement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await caseService.addMovement(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const removeMovement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await caseService.removeMovement(
      tenantOf(req),
      req.params.id as string,
      req.params.movementId as string,
    );
    res.json(respObj({ data, message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
