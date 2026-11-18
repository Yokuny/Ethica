import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { BillingPay, BillingRouterDeps } from './billing.schema.js';
import * as billingService from './billing.service.js';

export const getBilling = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await billingService.getBillingView(req.tenantUser) }));
  } catch (e) {
    next(e);
  }
};

export const pay =
  (deps: BillingRouterDeps) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { plan } = req.body as BillingPay;
      res.json(respObj({ data: await billingService.pay(deps, req.tenantUser, plan) }));
    } catch (e) {
      next(e);
    }
  };

export const webhook =
  (deps: BillingRouterDeps) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!billingService.validWebhookToken(deps.webhookToken, req.headers['asaas-access-token'])) {
        throw new CustomError('invalid_access', 401);
      }
      await billingService.receiveWebhook(req.body);
      res.json(respObj({ data: { received: true } }));
    } catch (e) {
      next(e);
    }
  };
