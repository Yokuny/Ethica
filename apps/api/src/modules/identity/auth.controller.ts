import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { clearCookieOptions, cookieOptions } from '../../config/cookie.config.js';
import { extractToken } from '../../middlewares/authentication.middleware.js';
import type { ListUsersQuery } from './auth.schema.js';
import * as authService from './auth.service.js';

export const signin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deviceInfo = (req.headers['user-agent'] as string | undefined) ?? 'unknown';
    const sessionToken = await authService.signin(req.body, deviceInfo);
    res.cookie('refreshToken', sessionToken, cookieOptions);
    res.json(respObj({ message: 'signed_in_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const signout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.signout(extractToken(req));
    res.clearCookie('refreshToken', clearCookieOptions);
    res.json(respObj({ message: 'signed_out_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const session = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.getSessionView(req.tenantUser);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { active } = req.query as ListUsersQuery;
    const data = await authService.listUsers(req.tenantUser.tenant as string, { activeOnly: active === 'true' });
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const listUserDirectory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.listUserDirectory(req.tenantUser.tenant as string);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const getUserAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const avatar = await authService.getUserAvatar(req.tenantUser.tenant as string, req.params.id as string);
    // A URL leva a versão (?v=), então a imagem nunca muda sob o mesmo endereço.
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.type(avatar.contentType).send(avatar.data);
  } catch (e) {
    next(e);
  }
};
