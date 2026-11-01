import { Session, Tenant, User } from '@ethica/db';
import type { AuthDeps } from '../../middlewares/authentication.middleware.js';

// Real AuthDeps adapter over @ethica/db — the only source of req.tenantUser
// (FND-05). Extracted from app.ts (T6, design.md Component 1/6) to be
// reused both by the HTTP pipeline (app.ts) and by the WS handshake
// (server.ts → createInboxSocketServer, T4), without duplicating the 4 database
// access functions between the two entry points.
export const buildAuthDeps = (): AuthDeps => ({
  findSessionByHash: async (tokenHash) => {
    const session = await Session.findOne({ tokenHash }).lean();
    return session ? { user: session.user.toString(), deviceInfo: session.deviceInfo } : null;
  },
  revokeAllSessions: async (userId) => {
    await Session.deleteMany({ user: userId });
  },
  getUserById: async (userId) => {
    const user = await User.findById(userId).lean();
    return user
      ? {
          id: user._id.toString(),
          tenant: user.Tenant?.toString(),
          role: user.role,
          permissions: user.permissions,
          isPlatformAdmin: user.isPlatformAdmin,
          active: user.active,
        }
      : null;
  },
  getTenantById: async (tenantId) => {
    const tenant = await Tenant.findById(tenantId).lean();
    return tenant ? { id: tenant._id.toString(), name: tenant.name, status: tenant.status } : null;
  },
});
