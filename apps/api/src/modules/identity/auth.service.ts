import { hashToken } from '@ethica/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as activityLogService from './activityLog.service.js';
import * as authRepository from './auth.repository.js';
import type { SessionView, SignIn, TenantUser, UpdatePermissions } from './auth.schema.js';

const SESSION_TTL_MS = 4 * 24 * 60 * 60 * 1000;

// Everything that writes a session is AWAITED before returning the token for the
// controller to build the cookie — fixes the reference's `saveRefreshToken(...)` without await
// (Risk 5): without it, the cookie could reach the client before
// the session existed in the database, and the first /auth/session got a 401.
export const signin = async (data: SignIn, deviceInfo: string): Promise<string> => {
  const user = await authRepository.findUserByEmail(data.email);
  if (!user?.active || !(await bcrypt.compare(data.password, user.password))) {
    throw new CustomError('invalid_credentials', 401);
  }

  const sessionToken = jwt.sign({ user: user.id }, env.SESSION_JWT_SECRET, { expiresIn: '4d' });
  await authRepository.createSession({
    user: user.id,
    tenant: user.tenant,
    tokenHash: hashToken(sessionToken),
    deviceInfo,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  // Signing in goes to the activity log (AD-134); whoever has no tenant (platform) does not.
  if (user.tenant)
    void activityLogService.record({ tenantId: user.tenant, userId: user.id, module: 'account', action: 'signin' });

  return sessionToken;
};

// No token validation on purpose: logout has to work even with the
// session already expired/revoked (the controller clears the cookie
// anyway). Whoever has the token could already use it — deleting their session gives
// nobody access to anything more.
export const signout = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  await authRepository.deleteSessionByTokenHash(hashToken(token));
};

// req.tenantUser already came from the database (createAuthMiddleware — FND-05); here it only
// adds the display fields (name, e-mail, status) that the minimal TenantUser
// payload does not carry — another database read, never the token.
export const getSessionView = async (tenantUser: TenantUser): Promise<SessionView> => {
  const user = await authRepository.findUserView(tenantUser.user);
  if (!user) throw new CustomError('invalid_session', 401, 'usuário não encontrado');

  const tenant = tenantUser.tenant ? await authRepository.findTenantView(tenantUser.tenant) : undefined;

  return { tenant: tenant ?? undefined, user, role: tenantUser.role, permissions: tenantUser.permissions };
};

// MOD-07: batch read for other modules (order.getOrder — T13)
// to resolve a user name without a second query per item.
export const findUserNamesByIds = authRepository.findUserNamesByIds;

// Tenant directory, used by the "assignee" filter of the conversation
// queue (inbox) — same shape as findUserNamesByIds, without the `$in` of ids.
export const listUsers = (tenantId: string, options: { activeOnly?: boolean } = {}) =>
  authRepository.listUsers(tenantId, options);

// AD-137: the admin adjusts a member's matrix; admin has everything and has no matrix.
export const updatePermissions = async (tenantId: string, userId: string, data: UpdatePermissions) => {
  const target = await authRepository.findUserRole(tenantId, userId);
  if (!target) throw new CustomError('not_found', 404);
  if (target.includes('admin')) throw new CustomError('admin_has_all_permissions', 422);
  await authRepository.updatePermissions(tenantId, userId, data.permissions);
};

// REG-07 (AD-071): full directory for the users screen (admin only).
export const listUserDirectory = (tenantId: string) => authRepository.listUserDirectory(tenantId);

// ACC-06: photo bytes of a tenant user.
export const getUserAvatar = async (tenantId: string, userId: string) => {
  const avatar = await authRepository.findUserAvatar(tenantId, userId);
  if (!avatar) throw new CustomError('not_found', 404);
  return avatar;
};

// MOD-04: other modules (conversation.service — T15) resolve the name of ONE
// User (e.g. who has taken over the conversation) only through here, never through the
// repository — same shape as authRepository.findUserView.
export const findUserView = authRepository.findUserView;

// MOD-04/MOD-05 (T21): card.service.assertReferencesExist confirma a
// a User's existence (assignee) only through here, never with `User.exists`
// direto.
export const userExists = authRepository.userExists;

// ENR-07: assignee eligibility (active User of the same tenant).
export const userIsActive = authRepository.userIsActive;
