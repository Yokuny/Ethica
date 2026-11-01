import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as importacaoService from './importacao.service.js';
import type { ListPericiasQuery } from './pericia.schema.js';
import * as periciaService from './pericia.service.js';
import { PericiaNotFoundError } from './pericia.service.js';

// O Tenant vem sempre de req.tenantUser (AD-010), nunca do corpo/query.
const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof PericiaNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

const PARADAS_NO_INICIO = 5;

export const createPericia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await periciaService.createPericia({ ...req.body, tenant: tenantOf(req) });
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const listPericias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await periciaService.listPericias(tenantOf(req), req.query as unknown as ListPericiasQuery);
    res.json(respObj({ data: result }));
  } catch (e) {
    next(e);
  }
};

export const getPericia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await periciaService.getPericia(tenantOf(req), req.params.id as string) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const updatePericia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await periciaService.updatePericia(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deletePericia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await periciaService.deletePericia(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const periciaStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await periciaService.periciaStats(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

export const periciaDistribution = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await periciaService.periciaDistribution(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

// Bloco "Perícias paradas" do início (GES-05): o total e as mais antigas, mesma regra do PDF.
export const resumoParadas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const paradas = await periciaService.listParadas(tenantOf(req));
    res.json(respObj({ data: { total: paradas.length, items: paradas.slice(0, PARADAS_NO_INICIO) } }));
  } catch (e) {
    next(e);
  }
};

// Importação (AD-114, AD-118): o arquivo chega como corpo pelo `fileBody` do router.
export const importarPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await importacaoService.extrairPdf(tenantOf(req), req.body) }));
  } catch (e) {
    next(e);
  }
};

export const importarCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await importacaoService.importarCsv(tenantOf(req), req.body) }));
  } catch (e) {
    next(e);
  }
};

export const addMovimentacao = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await periciaService.addMovimentacao(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const removeMovimentacao = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await periciaService.removeMovimentacao(
      tenantOf(req),
      req.params.id as string,
      req.params.movimentacaoId as string,
    );
    res.json(respObj({ data, message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
