import { respObj } from '@ethica/contracts';
import { hashToken } from '@ethica/db';
import type { NextFunction, Request, Response } from 'express';
import { extractToken } from '../../middlewares/authentication.middleware.js';
import type { ChangePassword, UpdateAvatar, UpdateProfile } from './account.schema.js';
import * as accountService from './account.service.js';

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await accountService.getProfile(req.tenantUser.tenant as string, req.tenantUser.user);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await accountService.updateProfile(
      req.tenantUser.tenant as string,
      req.tenantUser.user,
      req.body as UpdateProfile,
    );
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // validToken já garantiu que o token existe e é desta sessão.
    await accountService.changePassword(
      req.tenantUser.tenant as string,
      req.tenantUser.user,
      req.body as ChangePassword,
      hashToken(extractToken(req) as string),
    );
    res.json(respObj({}));
  } catch (e) {
    next(e);
  }
};

export const updateAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { image } = req.body as UpdateAvatar;
    const data = await accountService.setAvatar(req.tenantUser.tenant as string, req.tenantUser.user, image);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const removeAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await accountService.setAvatar(req.tenantUser.tenant as string, req.tenantUser.user, null);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const calendarFeedStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await accountService.calendarFeedStatus(req.tenantUser.tenant as string, req.tenantUser.user);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const gerarCalendarFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await accountService.gerarCalendarFeed(req.tenantUser.tenant as string, req.tenantUser.user);
    res.status(201).json(respObj({ data, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const revogarCalendarFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await accountService.revogarCalendarFeed(req.tenantUser.tenant as string, req.tenantUser.user);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    next(e);
  }
};
