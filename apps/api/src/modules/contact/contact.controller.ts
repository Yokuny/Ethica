import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { ContactMessage, ContactRouterDeps } from './contact.schema.js';
import * as contactService from './contact.service.js';

export const send =
  (deps: ContactRouterDeps) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await contactService.send(deps, req.body as ContactMessage);
      res.json(respObj({ data: { sent: true } }));
    } catch (e) {
      next(e);
    }
  };
