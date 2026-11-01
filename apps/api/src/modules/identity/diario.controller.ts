import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { ListDiarioQuery } from './diario.schema.js';
import * as diarioService from './diario.service.js';

export const listAtividades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await diarioService.listAtividades(
      req.tenantUser.tenant as string,
      req.query as unknown as ListDiarioQuery,
    );
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};
