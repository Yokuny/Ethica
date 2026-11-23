import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { CategoriesQuery, FlowQuery, ListTransactionsQuery, RevenueGoalQuery } from './transaction.schema.js';
import * as transactionService from './transaction.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const result = await transactionService.createTransaction(tenantOf(req), req.body);
  res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
};

export const listTransactions = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListTransactionsQuery;
  res.json(respObj({ data: await transactionService.listTransactions(tenantOf(req), query) }));
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  const result = await transactionService.updateTransaction(tenantOf(req), req.params.id as string, req.body);
  res.json(respObj({ data: result }));
};

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  await transactionService.deleteTransaction(tenantOf(req), req.params.id as string);
  res.json(respObj({ message: 'removed_successfully' }));
};

export const summary = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await transactionService.summary(tenantOf(req)) }));
};

export const revenueGoal = async (req: Request, res: Response): Promise<void> => {
  const { year } = req.query as unknown as RevenueGoalQuery;
  res.json(respObj({ data: await transactionService.revenueGoal(tenantOf(req), year) }));
};

export const feesDashboard = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await transactionService.feesDashboard(tenantOf(req)) }));
};

export const monthlyFlow = async (req: Request, res: Response): Promise<void> => {
  const { months } = req.query as unknown as FlowQuery;
  res.json(respObj({ data: await transactionService.monthlyFlow(tenantOf(req), months) }));
};

export const listExpenseNames = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await transactionService.listExpenseNames(tenantOf(req)) }));
};

export const totalsByCategory = async (req: Request, res: Response): Promise<void> => {
  const { kind, months } = req.query as unknown as CategoriesQuery;
  res.json(respObj({ data: await transactionService.totalsByCategory(tenantOf(req), kind, months) }));
};

export const addInstallment = async (req: Request, res: Response): Promise<void> => {
  const result = await transactionService.addInstallment(tenantOf(req), req.params.id as string, req.body);
  res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
};

export const reverseInstallment = async (req: Request, res: Response): Promise<void> => {
  const result = await transactionService.reverseInstallment(
    tenantOf(req),
    req.params.id as string,
    req.params.installmentId as string,
  );
  res.json(respObj({ data: result }));
};
