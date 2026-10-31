import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { ListPartesQuery } from './parte.schema.js';
import * as parteService from './parte.service.js';
import { ParteNotFoundError } from './parte.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof ParteNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

export const createParte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await parteService.createParte(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const listPartes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await parteService.listPartes(tenantOf(req), req.query as unknown as ListPartesQuery);
    res.json(respObj({ data: result }));
  } catch (e) {
    next(e);
  }
};

export const getParte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await parteService.getParte(tenantOf(req), req.params.id as string) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const updateParte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await parteService.updateParte(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listPericiasDaParte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await parteService.listPericiasDaParte(tenantOf(req), req.params.id as string);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
