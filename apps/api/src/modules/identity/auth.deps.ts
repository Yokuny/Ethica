import type { AuthDeps } from '../../middlewares/authentication.middleware.js';
import * as authRepository from './auth.repository.js';

// Real AuthDeps adapter — the only source of req.tenantUser (FND-05).
export const buildAuthDeps = (): AuthDeps => ({
  findSessionByHash: (tokenHash) => authRepository.findSessionByHash(tokenHash),
  revokeAllSessions: (userId) => authRepository.revokeAllSessions(userId),
  getUserById: (userId) => authRepository.findSessionUser(userId),
  getTenantById: (tenantId) => authRepository.findSessionTenant(tenantId),
});
