import type { Request, Response } from 'express';
import * as feedService from './feed.service.js';

// Public route (PRZ-03): the token is the credential. A missing or revoked link, an inactive user
// or a suspended tenant all answer the same 404 — nothing tells whether the token ever existed.
export const calendarFeed = async (req: Request, res: Response): Promise<void> => {
  const ics = await feedService.generateFeed(req.params.token as string);
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Cache-Control', 'private, max-age=300');
  res.send(ics);
};
