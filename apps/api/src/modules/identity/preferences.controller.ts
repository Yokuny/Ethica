import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { UpdatePreferences } from './preferences.schema.js';
import * as preferencesService from './preferences.service.js';

export const getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await preferencesService.getPreferences(req.tenantUser.tenant as string, req.tenantUser.user);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await preferencesService.updatePreferences(
      req.tenantUser.tenant as string,
      req.tenantUser.user,
      req.body as UpdatePreferences,
    );
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};
