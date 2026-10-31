import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { PericiaNotFoundError } from './pericia.service.js';
import type { ListPrazosPendentesQuery } from './prazo.schema.js';
import * as prazoService from './prazo.service.js';
import { PrazoNotFoundError } from './prazo.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// Prazo ou perícia inexistentes (ou de outro tenant) -> 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof PrazoNotFoundError || e instanceof PericiaNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createPrazo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await prazoService.createPrazo(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listPrazosDaPericia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await prazoService.listPrazosDaPericia(tenantOf(req), req.params.id as string) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listPrazosPendentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListPrazosPendentesQuery;
    res.json(respObj({ data: await prazoService.listPrazosPendentes(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const updatePrazo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await prazoService.updatePrazo(tenantOf(req), req.params.prazoId as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deletePrazo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prazoService.deletePrazo(tenantOf(req), req.params.prazoId as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
