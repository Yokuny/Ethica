import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import * as inviteService from './invite.service.js';

export const peekInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await inviteService.peekInvite(req.params.token as string);
    res.json(respObj({ data: result }));
  } catch (e) {
    next(e);
  }
};

export const acceptInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await inviteService.acceptInvite(req.params.token as string, req.body);
    res.status(201).json(respObj({ data, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};
