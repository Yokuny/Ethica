import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { UpdateAvatar, UpdateProfile } from './account.schema.js';
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

export const generateCalendarFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await accountService.generateCalendarFeed(req.tenantUser.tenant as string, req.tenantUser.user);
    res.status(201).json(respObj({ data, message: 'created_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const revokeCalendarFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await accountService.revokeCalendarFeed(req.tenantUser.tenant as string, req.tenantUser.user);
    res.json(respObj({ message: 'removed_successfully' }));
  } catch (e) {
    next(e);
  }
};
