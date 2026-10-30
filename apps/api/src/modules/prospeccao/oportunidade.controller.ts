import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { DatajudClient } from '../../providers/datajudClient.js';
import type { ListOportunidadesQuery } from './oportunidade.schema.js';
import * as oportunidadeService from './oportunidade.service.js';
import { OportunidadeNotFoundError } from './oportunidade.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof OportunidadeNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

export const searchDatajud =
  (client: DatajudClient | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(respObj({ data: await oportunidadeService.searchDatajud(client, tenantOf(req), req.body) }));
    } catch (e) {
      next(e);
    }
  };

export const createOportunidade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await oportunidadeService.createOportunidade(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const listOportunidades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListOportunidadesQuery;
    res.json(respObj({ data: await oportunidadeService.listOportunidades(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const oportunidadeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await oportunidadeService.oportunidadeStats(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

export const updateOportunidade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await oportunidadeService.updateOportunidade(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteOportunidade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await oportunidadeService.deleteOportunidade(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const converterOportunidade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await oportunidadeService.converterOportunidade(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
