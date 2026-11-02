import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { clearCookieOptions, cookieOptions } from '../../config/cookie.config.js';
import { extractToken } from '../../middlewares/authentication.middleware.js';
import type { MailProvider } from '../../providers/mail/index.js';
import type { ListUsersQuery } from './auth.schema.js';
import * as authService from './auth.service.js';

const deviceOf = (req: Request) => (req.headers['user-agent'] as string | undefined) ?? 'unknown';

export const requestAccessKey =
  (mailProvider: MailProvider, accessUrl: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.requestAccessKey(req.body.email, mailProvider, accessUrl);
      res.json(respObj({ message: 'access_key_sent' }));
    } catch (e) {
      next(e);
    }
  };

export const verifyAccessKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.verifyAccessKey(req.body, deviceOf(req));
    if ('signupToken' in result) {
      res.json(respObj({ data: { signupToken: result.signupToken } }));
      return;
    }
    res.cookie('refreshToken', result.sessionToken, cookieOptions);
    res.json(respObj({ data: { signedIn: true }, message: 'signed_in_successfully' }));
  } catch (e) {
    next(e);
  }
};

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionToken = await authService.signup(req.body, deviceOf(req));
    res.cookie('refreshToken', sessionToken, cookieOptions);
    res.status(201).json(respObj({ message: 'created_successfully' }));
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

export const updatePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.updatePermissions(req.tenantUser.tenant as string, req.params.id as string, req.body);
    res.json(respObj({}));
  } catch (e) {
    next(e);
  }
};

export const getUserAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const avatar = await authService.getUserAvatar(req.tenantUser.tenant as string, req.params.id as string);
    // The URL carries the version (?v=), so the image never changes under the same address.
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.type(avatar.contentType).send(avatar.data);
  } catch (e) {
    next(e);
  }
};
