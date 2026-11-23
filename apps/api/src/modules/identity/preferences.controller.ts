import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { UpdatePreferences } from './preferences.schema.js';
import * as preferencesService from './preferences.service.js';

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  const data = await preferencesService.getPreferences(req.tenantUser.tenant as string, req.tenantUser.user);
  res.json(respObj({ data }));
};

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  const data = await preferencesService.updatePreferences(
    req.tenantUser.tenant as string,
    req.tenantUser.user,
    req.body as UpdatePreferences,
  );
  res.json(respObj({ data }));
};
