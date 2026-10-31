import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as feedService from './feed.service.js';

// Rota pública (PRZ-03): o token é a credencial. Link inexistente, revogado, usuário inativo
// ou tenant suspenso respondem o mesmo 404 — nada diz se o token já existiu.
export const calendarFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ics = await feedService.gerarFeed(req.params.token as string);
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
