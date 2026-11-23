import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { UpdateAvatar, UpdateProfile } from './account.schema.js';
import * as accountService from './account.service.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const data = await accountService.getProfile(req.tenantUser.tenant as string, req.tenantUser.user);
  res.json(respObj({ data }));
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const data = await accountService.updateProfile(
    req.tenantUser.tenant as string,
    req.tenantUser.user,
    req.body as UpdateProfile,
  );
  res.json(respObj({ data }));
};

export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  const { image } = req.body as UpdateAvatar;
  const data = await accountService.setAvatar(req.tenantUser.tenant as string, req.tenantUser.user, image);
  res.json(respObj({ data }));
};

export const removeAvatar = async (req: Request, res: Response): Promise<void> => {
  const data = await accountService.setAvatar(req.tenantUser.tenant as string, req.tenantUser.user, null);
  res.json(respObj({ data }));
};

export const calendarFeedStatus = async (req: Request, res: Response): Promise<void> => {
  const data = await accountService.calendarFeedStatus(req.tenantUser.tenant as string, req.tenantUser.user);
  res.json(respObj({ data }));
};

export const generateCalendarFeed = async (req: Request, res: Response): Promise<void> => {
  const data = await accountService.generateCalendarFeed(req.tenantUser.tenant as string, req.tenantUser.user);
  res.status(201).json(respObj({ data, message: 'created_successfully' }));
};

export const revokeCalendarFeed = async (req: Request, res: Response): Promise<void> => {
  await accountService.revokeCalendarFeed(req.tenantUser.tenant as string, req.tenantUser.user);
  res.json(respObj({ message: 'removed_successfully' }));
};

export const listPasskeys = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await accountService.listPasskeys(req.tenantUser.user) }));
};

export const removePasskey = async (req: Request, res: Response): Promise<void> => {
  await accountService.removePasskey(req.tenantUser.user, req.params.id as string);
  res.json(respObj({ message: 'removed_successfully' }));
};
