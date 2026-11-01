import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { DatajudClient } from '../../providers/datajudClient.js';
import type { ListOpportunitiesQuery } from './opportunity.schema.js';
import * as opportunityService from './opportunity.service.js';
import { OpportunityNotFoundError } from './opportunity.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof OpportunityNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

export const searchDatajud =
  (client: DatajudClient | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(respObj({ data: await opportunityService.searchDatajud(client, tenantOf(req), req.body) }));
    } catch (e) {
      next(e);
    }
  };

export const createOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await opportunityService.createOpportunity(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const listOpportunities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListOpportunitiesQuery;
    res.json(respObj({ data: await opportunityService.listOpportunities(tenantOf(req), query) }));
  } catch (e) {
    next(e);
  }
};

export const opportunityStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await opportunityService.opportunityStats(tenantOf(req)) }));
  } catch (e) {
    next(e);
  }
};

export const updateOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await opportunityService.updateOpportunity(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const deleteOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await opportunityService.deleteOpportunity(tenantOf(req), req.params.id as string);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const convertOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await opportunityService.convertOpportunity(tenantOf(req), req.params.id as string, req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
