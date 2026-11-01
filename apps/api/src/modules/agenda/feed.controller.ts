import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as feedService from './feed.service.js';

// Public route (PRZ-03): the token is the credential. A missing or revoked link, an inactive user
// or a suspended tenant all answer the same 404 — nothing tells whether the token ever existed.
export const calendarFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ics = await feedService.generateFeed(req.params.token as string);
    if (!ics) {
      next(new CustomError('not_found', 404));
      return;
    }
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'private, max-age=300');
    res.send(ics);
  } catch (e) {
    next(e);
  }
};
