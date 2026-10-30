import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { PericiaNotFoundError } from '../pericia/pericia.service.js';
import type { ListCompromissosQuery, UpcomingCompromissosQuery } from './compromisso.schema.js';
import * as compromissoService from './compromisso.service.js';
import { CompromissoNotFoundError } from './compromisso.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// Compromisso ou perícia vinculada inexistentes (ou de outro tenant) -> 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof CompromissoNotFoundError || e instanceof PericiaNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createCompromisso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await compromissoService.createCompromisso(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listCompromissos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListCompromissosQuery;
    res.json(respObj({ data: await compromissoService.listCompromissos(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const listUpcoming = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as UpcomingCompromissosQuery;
    res.json(respObj({ data: await compromissoService.listUpcoming(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const updateCompromisso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await compromissoService.updateCompromisso(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteCompromisso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await compromissoService.deleteCompromisso(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
