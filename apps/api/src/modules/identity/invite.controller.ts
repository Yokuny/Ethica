import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import * as inviteService from './invite.service.js';

export const peekInvite = async (req: Request, res: Response): Promise<void> => {
  const result = await inviteService.peekInvite(req.params.token as string);
  res.json(respObj({ data: result }));
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  const data = await inviteService.acceptInvite(req.params.token as string, req.body);
  res.status(201).json(respObj({ data, message: 'created_successfully' }));
};
