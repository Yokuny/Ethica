import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { PericiaNotFoundError } from '../pericia/pericia.service.js';
import type { FluxoQuery, ListLancamentosQuery } from './lancamento.schema.js';
import * as lancamentoService from './lancamento.service.js';
import { LancamentoNotFoundError } from './lancamento.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof LancamentoNotFoundError || e instanceof PericiaNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createLancamento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lancamentoService.createLancamento(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listLancamentos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListLancamentosQuery;
    res.json(respObj({ data: await lancamentoService.listLancamentos(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const updateLancamento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lancamentoService.updateLancamento(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteLancamento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await lancamentoService.deleteLancamento(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const resumo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await lancamentoService.resumo(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

export const fluxoMensal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { meses } = req.query as unknown as FluxoQuery;
    res.json(respObj({ data: await lancamentoService.fluxoMensal(tenantOf(req), meses) }));
  } catch (e) {
    next(e);
  }
};

export const totaisPorCategoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const natureza = req.query.natureza as string;
    res.json(respObj({ data: await lancamentoService.totaisPorCategoria(tenantOf(req), natureza) }));
  } catch (e) {
    next(e);
  }
};

export const addParcela = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lancamentoService.addParcela(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const estornarParcela = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lancamentoService.estornarParcela(
      tenantOf(req),
      req.params.id as string,
      req.params.parcelaId as string,
    );
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
