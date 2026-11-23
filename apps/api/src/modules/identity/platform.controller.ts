import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import * as platformService from './platform.service.js';

export const provisionTenant = async (req: Request, res: Response): Promise<void> => {
  const result = await platformService.provisionTenant(req.body);
  res.status(201).json(respObj({ data: result }));
};
