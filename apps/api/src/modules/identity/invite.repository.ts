import { Invite, Session, transitionTenantStatus, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { InviteWithTenant, Permissions, Role } from './invite.schema.js';

// Forma populada mínima — evita importar `mongoose` neste app (só
// packages/db pode, ver T25/AD-010).
type PopulatedTenant = { _id: { toString: () => string }; name: string };

export const findInviteWithTenantByHash = async (tokenHash: string): Promise<InviteWithTenant | null> =>
  withDbTiming('invite.findInviteWithTenantByHash', async () => {
    const invite = await Invite.findOne({ tokenHash }).populate<{ Tenant: PopulatedTenant }>('Tenant', 'name').lean();
    if (!invite) return null;
    return {
      id: invite._id.toString(),
      tenant: invite.Tenant._id.toString(),
      tenantName: invite.Tenant.name,
      email: invite.email,
      role: invite.role,
      permissions: invite.permissions,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  });

// Aceite concorrente (FND-15): a guarda é a própria query — só aceita quando
// ainda está pending e não expirado. Quem perde a corrida recebe null.
export const acceptInviteAtomic = async (tokenHash: string): Promise<InviteWithTenant | null> =>
  withDbTiming('invite.acceptInviteAtomic', async () => {
    const invite = await Invite.findOneAndUpdate(
      { tokenHash, status: 'pending', expiresAt: { $gt: new Date() } },
      { $set: { status: 'accepted' } },
      { returnDocument: 'after' },
    )
      .populate<{ Tenant: PopulatedTenant }>('Tenant', 'name')
      .lean();
    if (!invite) return null;
    return {
      id: invite._id.toString(),
      tenant: invite.Tenant._id.toString(),
      tenantName: invite.Tenant.name,
      email: invite.email,
      role: invite.role,
      permissions: invite.permissions,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  });

export const activateTenant = async (tenantId: string): Promise<void> =>
  withDbTiming('invite.activateTenant', async () => {
    await transitionTenantStatus(tenantId, 'provisioned', 'active');
  });

export const createUserFromInvite = async (data: {
  name: string;
  email: string;
  password: string;
  tenant: string;
  role: Role;
  permissions?: Permissions;
}): Promise<{ id: string }> =>
  withDbTiming('invite.createUserFromInvite', async () => {
    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      Tenant: data.tenant,
      role: [data.role],
      permissions: data.permissions,
    });
    return { id: user.id };
  });

export const createSession = async (data: {
  user: string;
  tenant: string;
  tokenHash: string;
  deviceInfo: string;
  expiresAt: Date;
}): Promise<void> =>
  withDbTiming('invite.createSession', async () => {
    await Session.create({
      user: data.user,
      Tenant: data.tenant,
      tokenHash: data.tokenHash,
      deviceInfo: data.deviceInfo,
      expiresAt: data.expiresAt,
    });
  });
