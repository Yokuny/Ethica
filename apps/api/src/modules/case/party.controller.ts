import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { ListPartiesQuery } from './party.schema.js';
import * as partyService from './party.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

export const createParty = async (req: Request, res: Response): Promise<void> => {
  const result = await partyService.createParty(tenantOf(req), req.body);
  res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
};

export const mergeDuplicates = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await partyService.mergeDuplicates(tenantOf(req)) }));
};

export const listParties = async (req: Request, res: Response): Promise<void> => {
  const result = await partyService.listParties(tenantOf(req), req.query as unknown as ListPartiesQuery);
  res.json(respObj({ data: result }));
};

export const getParty = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await partyService.getParty(tenantOf(req), req.params.id as string) }));
};

export const updateParty = async (req: Request, res: Response): Promise<void> => {
  const result = await partyService.updateParty(tenantOf(req), req.params.id as string, req.body);
  res.json(respObj({ data: result }));
};

export const listPartyCases = async (req: Request, res: Response): Promise<void> => {
  const result = await partyService.listPartyCases(tenantOf(req), req.params.id as string);
  res.json(respObj({ data: result }));
};
