import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { ListPartiesQuery } from './party.schema.js';
import * as partyService from './party.service.js';
import { PartyNotFoundError } from './party.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof PartyNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

export const createParty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await partyService.createParty(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const listParties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await partyService.listParties(tenantOf(req), req.query as unknown as ListPartiesQuery);
    res.json(respObj({ data: result }));
  } catch (e) {
    next(e);
  }
};

export const getParty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await partyService.getParty(tenantOf(req), req.params.id as string) }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const updateParty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await partyService.updateParty(tenantOf(req), req.params.id as string, req.body);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const listPartyCases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await partyService.listPartyCases(tenantOf(req), req.params.id as string);
    res.json(respObj({ data: result }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};
