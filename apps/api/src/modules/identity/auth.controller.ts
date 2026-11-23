import { respObj } from '@ethica/contracts';
import type { MailProvider } from '@ethica/mail';
import type { Request, Response } from 'express';
import { clearCookieOptions, cookieOptions } from '../../config/cookie.config.js';
import { extractToken } from '../../middlewares/authentication.middleware.js';
import type { ListUsersQuery } from './auth.schema.js';
import * as authService from './auth.service.js';

const deviceOf = (req: Request) => (req.headers['user-agent'] as string | undefined) ?? 'unknown';

export const requestAccessKey =
  (mailProvider: MailProvider, accessUrl: string) =>
  async (req: Request, res: Response): Promise<void> => {
    await authService.requestAccessKey(req.body.email, mailProvider, accessUrl);
    res.json(respObj({ message: 'access_key_sent' }));
  };

// ACE-03/APA-03: the key leads to the passkey of this device (or to the office creation).
export const verifyAccessKey = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await authService.verifyAccessKey(req.body) }));
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(respObj({ data: await authService.signup(req.body), message: 'created_successfully' }));
};

export const passkeyRegistrationOptions = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await authService.passkeyRegistrationOptions(req.body.passkeyToken) }));
};

export const passkeySigninOptions = async (_req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await authService.passkeySigninOptions() }));
};

// APA-02/03: both end with the session cookie, bound to this browser (deviceInfo).
const openSession = (open: typeof authService.registerPasskey) => async (req: Request, res: Response) => {
  res.cookie('refreshToken', await open(req.body, deviceOf(req)), cookieOptions);
  res.json(respObj({ data: { signedIn: true }, message: 'signed_in_successfully' }));
};

export const registerPasskey = openSession(authService.registerPasskey);
export const signinWithPasskey = openSession(authService.signinWithPasskey);

export const signout = async (req: Request, res: Response): Promise<void> => {
  await authService.signout(extractToken(req));
  res.clearCookie('refreshToken', clearCookieOptions);
  res.json(respObj({ message: 'signed_out_successfully' }));
};

export const session = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.getSessionView(req.tenantUser);
  res.json(respObj({ data }));
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const { active } = req.query as ListUsersQuery;
  const data = await authService.listUsers(req.tenantUser.tenant as string, { activeOnly: active === 'true' });
  res.json(respObj({ data }));
};

export const listUserDirectory = async (req: Request, res: Response): Promise<void> => {
  const data = await authService.listUserDirectory(req.tenantUser.tenant as string);
  res.json(respObj({ data }));
};

export const updatePermissions = async (req: Request, res: Response): Promise<void> => {
  await authService.updatePermissions(req.tenantUser.tenant as string, req.params.id as string, req.body);
  res.json(respObj({}));
};

export const getUserAvatar = async (req: Request, res: Response): Promise<void> => {
  const avatar = await authService.getUserAvatar(req.tenantUser.tenant as string, req.params.id as string);
  // The URL carries the version (?v=), so the image never changes under the same address.
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  res.type(avatar.contentType).send(avatar.data);
};
