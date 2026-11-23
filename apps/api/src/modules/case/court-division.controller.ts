import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { ListCourtDivisionsQuery } from './court-division.schema.js';
import * as courtDivisionService from './court-division.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const id = (req: Request): string => req.params.id as string;

export const listCourtDivisions = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListCourtDivisionsQuery;
  res.json(respObj({ data: await courtDivisionService.listCourtDivisions(tenantOf(req), query) }));
};

export const listCities = async (req: Request, res: Response): Promise<void> => {
  const states = req.query.state as unknown as string[];
  res.json(respObj({ data: await courtDivisionService.listCities(tenantOf(req), states) }));
};

export const createCourtDivision = async (req: Request, res: Response): Promise<void> => {
  const data = await courtDivisionService.createCourtDivision(tenantOf(req), req.body);
  res.status(201).json(respObj({ data, message: 'created_successfully' }));
};

export const updateCourtDivision = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await courtDivisionService.updateCourtDivision(tenantOf(req), id(req), req.body) }));
};

export const deleteCourtDivision = async (req: Request, res: Response): Promise<void> => {
  await courtDivisionService.deleteCourtDivision(tenantOf(req), id(req));
  res.json(respObj({ message: 'removed_successfully' }));
};

export const importCsv = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await courtDivisionService.importCsv(tenantOf(req), req.body as string) }));
};
