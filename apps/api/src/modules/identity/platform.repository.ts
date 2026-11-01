import { Invite, Tenant, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CreateInviteInput } from './platform.schema.js';

export const createTenant = async (data: { name: string; document: string }): Promise<{ id: string }> =>
  withDbTiming('platform.createTenant', async () => {
    const tenant = await Tenant.create(data);
    return { id: tenant.id };
  });

export const findUserByEmailInTenant = async (tenantId: string, email: string): Promise<{ id: string } | null> =>
  withDbTiming('platform.findUserByEmailInTenant', async () => {
    const user = await User.findOne({ Tenant: tenantId, email }).lean();
    return user ? { id: user._id.toString() } : null;
  });

// FND-13: resending reuses — the previous pending invite (if any) is
// revoked before creating the new one, never leaving two valid at the same
// time. The model's unique partial index stays the safety
// net against a race (two concurrent revocations followed by two
// creates), not the normal resend path.
export const revokePendingInvites = async (tenantId: string, email: string): Promise<void> =>
  withDbTiming('platform.revokePendingInvites', async () => {
    await Invite.updateMany({ Tenant: tenantId, email, status: 'pending' }, { $set: { status: 'revoked' } });
  });

export const createInvite = async (data: CreateInviteInput): Promise<{ id: string }> =>
  withDbTiming('platform.createInvite', async () => {
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
  withDbTiming('platform.markInviteSent', async () => {
    await Invite.findByIdAndUpdate(id, { sentAt: new Date() });
  });

export const findUserByEmail = async (email: string): Promise<{ id: string } | null> =>
  withDbTiming('platform.findUserByEmail', async () => {
    const user = await User.findOne({ email }).lean();
    return user ? { id: user._id.toString() } : null;
  });
