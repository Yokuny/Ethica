import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { ListCourtDivisionsQuery } from './court-division.schema.js';
import * as courtDivisionService from './court-division.service.js';
import { CourtDivisionNotFoundError } from './court-division.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const id = (req: Request): string => req.params.id as string;

const json =
  (run: (req: Request) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await run(req);
      res.status(status).json(respObj(status === 201 ? { data, message: 'created_successfully' } : { data }));
    } catch (e) {
      next(e instanceof CourtDivisionNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
    }
  };

export const listCourtDivisions = json((req) =>
  courtDivisionService.listCourtDivisions(tenantOf(req), req.query as unknown as ListCourtDivisionsQuery),
);
export const listCities = json((req) => courtDivisionService.listCities(tenantOf(req), req.query.state as string));
export const createCourtDivision = json(
  (req) => courtDivisionService.createCourtDivision(tenantOf(req), req.body),
  201,
);
export const updateCourtDivision = json((req) =>
  courtDivisionService.updateCourtDivision(tenantOf(req), id(req), req.body),
);
export const deleteCourtDivision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await courtDivisionService.deleteCourtDivision(tenantOf(req), id(req));
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    next(e instanceof CourtDivisionNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
  }
};
export const importCsv = json((req) => courtDivisionService.importCsv(tenantOf(req), req.body as string));
