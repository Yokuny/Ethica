import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { FlowQuery, ListTransactionsQuery } from './transaction.schema.js';
import * as transactionService from './transaction.service.js';
import { TransactionNotFoundError } from './transaction.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof TransactionNotFoundError || e instanceof CaseNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await transactionService.createTransaction(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListTransactionsQuery;
    res.json(respObj({ data: await transactionService.listTransactions(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await transactionService.updateTransaction(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await transactionService.deleteTransaction(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const summary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await transactionService.summary(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

export const monthlyFlow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { months } = req.query as unknown as FlowQuery;
    res.json(respObj({ data: await transactionService.monthlyFlow(tenantOf(req), months) }));
  } catch (e) {
    next(e);
  }
};

export const totalsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const kind = req.query.kind as string;
    res.json(respObj({ data: await transactionService.totalsByCategory(tenantOf(req), kind) }));
  } catch (e) {
    next(e);
  }
};

export const addInstallment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await transactionService.addInstallment(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const reverseInstallment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await transactionService.reverseInstallment(
      tenantOf(req),
      req.params.id as string,
      req.params.installmentId as string,
    );
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
