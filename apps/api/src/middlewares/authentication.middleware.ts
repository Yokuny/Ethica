import crypto from 'node:crypto';
import { effectivePermissions, type Permissions, type Role, type TenantUser } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { CustomError } from './errorHandler.middleware.js';

declare global {
  namespace Express {
    interface Request {
      // Populated by createAuthMiddleware from the DATABASE — never from the
      // token payload (FND-05).
      tenantUser: TenantUser;
    }
  }
}

export type SessionRecord = {
  user: string;
  deviceInfo: string;
};

export type UserRecord = {
  id: string;
  tenant?: string;
  role: Role[];
  permissions?: Permissions;
  isPlatformAdmin: boolean;
  active: boolean;
};

export type TenantRecord = {
  id: string;
  name: string;
  status: string;
};

// Injected — the four database touch points the factory needs.
// Keeps the middleware testable without HTTP and without coupling to a
// concrete repository (the real implementation, over packages/db, is built by
// consumidor).
export type AuthDeps = {
  findSessionByHash: (tokenHash: string) => Promise<SessionRecord | null>;
  revokeAllSessions: (userId: string) => Promise<void>;
  getUserById: (userId: string) => Promise<UserRecord | null>;
  getTenantById: (tenantId: string) => Promise<TenantRecord | null>;
};

// Pure function: httpOnly `refreshToken` cookie OR `Authorization: Bearer` header.
// The reference had `mobileUser?.length !== 2 && mobileUser?.[0] !== "Ease"`
// (it only rejects when BOTH conditions fail). Here the two malformation
// conditions (wrong size OR wrong scheme) are checked together with a
// single `||`, so either one alone already rejects.
export const extractToken = (req: Request): string | undefined => {
  const cookieToken = req.cookies?.refreshToken;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (!authHeader) return undefined;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return undefined;

  return parts[1];
};

// Pure function: jwt→hash→Session→device match→User/Tenant validation, outside the
// Express pipeline so it can be reused (e.g. WebSocket handshake).
// `token` accepts `undefined` because `extractToken` can already return it
// when the credential did not come — the 401 is resolved here.
export const authenticateSession = async (
  token: string | undefined,
  deviceInfo: string,
  deps: AuthDeps,
): Promise<TenantUser> => {
  if (!token) throw new CustomError('invalid_session', 401);

  let userIdFromToken: string;
  try {
    const decoded = jwt.verify(token, env.SESSION_JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.user) throw new Error('payload inválido');
    userIdFromToken = decoded.user as string;
  } catch {
    throw new CustomError('invalid_session', 401, 'token inválido ou expirado');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await deps.findSessionByHash(tokenHash);
  if (!session) {
    console.error(JSON.stringify({ event: 'session.replay', userId: userIdFromToken }));
    throw new CustomError('invalid_session', 401);
  }

  if (session.deviceInfo !== deviceInfo) {
    await deps.revokeAllSessions(session.user);
    console.error(JSON.stringify({ event: 'session.device_mismatch', userId: session.user }));
    throw new CustomError('invalid_session', 401);
  }

  const user = await deps.getUserById(session.user);
  if (!user?.active) throw new CustomError('invalid_session', 401);

  const tenant = user.tenant ? await deps.getTenantById(user.tenant) : undefined;
  if (tenant?.status === 'suspended') throw new CustomError('tenant_suspended', 403);

  return {
    tenant: tenant?.id,
    user: user.id,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin,
    permissions: effectivePermissions(user.role, user.permissions),
  };
};

export const createAuthMiddleware = (deps: AuthDeps) => {
  const validToken = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractToken(req);
      const deviceInfo = req.headers['user-agent'] ?? 'unknown';
      req.tenantUser = await authenticateSession(token, deviceInfo, deps);
      next();
    } catch (e) {
      next(e);
    }
  };

  return { validToken };
};
