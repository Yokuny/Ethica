import { Invite, transitionTenantStatus, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CreateInviteInput, InviteWithTenant, Permissions, Role } from './invite.schema.js';

// Minimal populated shape — avoids importing `mongoose` in this app (only
// packages/db may, see T25/AD-010).
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

// Concurrent acceptance (FND-15): the guard is the query itself — it only accepts while
// still pending and not expired. Whoever loses the race gets null.
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
  tenant: string;
  role: Role;
  permissions?: Permissions;
}): Promise<{ id: string }> =>
  withDbTiming('invite.createUserFromInvite', async () => {
    const user = await User.create({
      name: data.name,
      email: data.email,
      Tenant: data.tenant,
      role: [data.role],
      permissions: data.permissions,
    });
    return { id: user.id };
  });

export const findUserByEmailInTenant = async (tenantId: string, email: string): Promise<{ id: string } | null> =>
  withDbTiming('invite.findUserByEmailInTenant', async () => {
    const user = await User.findOne({ Tenant: tenantId, email }).lean();
    return user ? { id: user._id.toString() } : null;
  });

// FND-13: resending reuses — the previous pending invite (if any) is
// revoked before creating the new one, never leaving two valid at the same
// time. The model's unique partial index stays the safety
// net against a race (two concurrent revocations followed by two
// creates), not the normal resend path.
export const revokePendingInvites = async (tenantId: string, email: string): Promise<void> =>
  withDbTiming('invite.revokePendingInvites', async () => {
    await Invite.updateMany({ Tenant: tenantId, email, status: 'pending' }, { $set: { status: 'revoked' } });
  });

export const createInvite = async (data: CreateInviteInput): Promise<{ id: string }> =>
  withDbTiming('invite.createInvite', async () => {
    const invite = await Invite.create({
      Tenant: data.tenant,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      invitedBy: data.invitedBy,
    });
    return { id: invite.id };
  });

// Missing sentAt = the e-mail did not go out (FND-12); only set when sending confirms success.
export const markInviteSent = async (id: string): Promise<void> =>
  withDbTiming('invite.markInviteSent', async () => {
    await Invite.findByIdAndUpdate(id, { sentAt: new Date() });
  });

export const findUserByEmail = async (email: string): Promise<{ id: string } | null> =>
  withDbTiming('invite.findUserByEmail', async () => {
    const user = await User.findOne({ email }).lean();
    return user ? { id: user._id.toString() } : null;
  });
