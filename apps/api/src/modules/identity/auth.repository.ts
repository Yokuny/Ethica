import { effectivePermissions } from '@ethica/contracts';
import { Session, Tenant, tenantScoped, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  Permissions,
  TenantUser,
  TenantView,
  UserAvatarImage,
  UserDirectoryEntry,
  UserForSignin,
  UserNameSummary,
  UserSummary,
  UserView,
} from './auth.schema.js';

// ACC-06: photo path with the version in the query — the URL changes when the photo changes,
// so the image response can be cached forever.
export const avatarPath = (userId: string, updatedAt: Date): string =>
  `/auth/users/${userId}/avatar?v=${updatedAt.getTime()}`;

const avatarOf = (user: { _id: { toString(): string }; avatarUpdatedAt?: Date }) =>
  user.avatarUpdatedAt ? { avatar: avatarPath(user._id.toString(), user.avatarUpdatedAt) } : {};

export const findUserByEmail = async (email: string): Promise<UserForSignin | null> =>
  withDbTiming('auth.findUserByEmail', async () => {
    const user = await User.findOne({ email }).lean();
    return user
      ? { id: user._id.toString(), tenant: user.Tenant?.toString(), password: user.password, active: user.active }
      : null;
  });

export const findUserView = async (userId: string): Promise<UserView | null> =>
  withDbTiming('auth.findUserView', async () => {
    const user = await User.findById(userId).lean();
    return user ? { id: user._id.toString(), name: user.name, email: user.email, ...avatarOf(user) } : null;
  });

export const findTenantView = async (tenantId: string): Promise<TenantView | null> =>
  withDbTiming('auth.findTenantView', async () => {
    const tenant = await Tenant.findById(tenantId).lean();
    return tenant ? { id: tenant._id.toString(), name: tenant.name, status: tenant.status } : null;
  });

// MOD-07: ONE `$in` query per batch — without ids there is no query at all. An id
// without a matching User (or from another tenant, AD-010) is simply left
// out of the returned array.
export const findUserNamesByIds = async (tenantId: string, ids: string[]): Promise<UserNameSummary[]> => {
  if (ids.length === 0) return [];

  return withDbTiming('auth.findUserNamesByIds', async () => {
    const users = await User.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }))
      .select('name')
      .lean();
    return users.map((user) => ({ id: user._id.toString(), name: user.name }));
  });
};

// Full tenant directory (no id filter) — used by the "assignee" filter of the
// conversation queue (inbox), which needs to offer EVERY
// operator of the tenant as an option, not only those already in a page of
// results. Sorted by name to stay stable and readable in a <Select>.
export const listUsers = async (tenantId: string, options: { activeOnly?: boolean } = {}): Promise<UserSummary[]> =>
  withDbTiming('auth.listUsers', async () => {
    const users = await User.find(tenantScoped({ Tenant: tenantId, ...(options.activeOnly ? { active: true } : {}) }))
      .select('name avatarUpdatedAt')
      .sort({ name: 1 })
      .lean();
    return users.map((user) => ({ id: user._id.toString(), name: user.name, ...avatarOf(user) }));
  });

// REG-07 (AD-071): directory for the users screen (admin) — same tenant scope and
// order as listUsers, with e-mail, role and state. Explicit `select`: the password
// never leaves the database through here.
export const listUserDirectory = async (tenantId: string): Promise<UserDirectoryEntry[]> =>
  withDbTiming('auth.listUserDirectory', async () => {
    const users = await User.find(tenantScoped({ Tenant: tenantId }))
      .select('name email role permissions active createdAt avatarUpdatedAt')
      .sort({ name: 1 })
      .lean();
    return users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: effectivePermissions(user.role, user.permissions),
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      ...avatarOf(user),
    }));
  });

export const findUserRole = async (tenantId: string, userId: string): Promise<TenantUser['role'] | null> =>
  withDbTiming('auth.findUserRole', async () => {
    const user = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('role')
      .lean();
    return user?.role ?? null;
  });

export const updatePermissions = async (tenantId: string, userId: string, permissions: Permissions): Promise<void> =>
  withDbTiming('auth.updatePermissions', async () => {
    await User.updateOne(tenantScoped({ Tenant: tenantId, _id: userId }), { $set: { permissions } });
  });

// ACC-06: the photo itself, only from someone in the same tenant (AD-010).
export const findUserAvatar = async (tenantId: string, userId: string): Promise<UserAvatarImage | null> =>
  withDbTiming('auth.findUserAvatar', async () => {
    const user = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('+avatar')
      .lean();
    const match = user?.avatar?.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    return match ? { contentType: match[1] as string, data: Buffer.from(match[2] as string, 'base64') } : null;
  });

// MOD-04/MOD-05 (T21): other modules (card) confirm a
// User's existence only through here, never with `User.exists` directly — same tenant scope as
// findUserView, without fetching the whole document.
// ENR-07: only an ACTIVE User of the tenant can get new work (assignee
// of a Process/task); whoever was deactivated stays visible but is not eligible.
export const userIsActive = async (tenantId: string, id: string): Promise<boolean> =>
  withDbTiming('auth.userIsActive', async () =>
    Boolean(await User.exists(tenantScoped({ Tenant: tenantId, _id: id, active: true }))),
  );

export const userExists = async (tenantId: string, id: string): Promise<boolean> =>
  withDbTiming('auth.userExists', async () => Boolean(await User.exists(tenantScoped({ Tenant: tenantId, _id: id }))));

// Session writes are always AWAITED by the caller (service) — the cookie can never
// reach the client before the record exists in the database (Risk 5).
export const createSession = async (data: {
  user: string;
  tenant?: string;
  tokenHash: string;
  deviceInfo: string;
  expiresAt: Date;
}): Promise<void> =>
  withDbTiming('auth.createSession', async () => {
    await Session.create({
      user: data.user,
      Tenant: data.tenant,
      tokenHash: data.tokenHash,
      deviceInfo: data.deviceInfo,
      expiresAt: data.expiresAt,
    });
  });

export const deleteSessionByTokenHash = async (tokenHash: string): Promise<void> =>
  withDbTiming('auth.deleteSession', async () => {
    await Session.deleteOne({ tokenHash });
  });
