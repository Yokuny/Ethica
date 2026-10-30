import { Session, tenantScoped, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { AccountView } from './account.schema.js';
import { avatarPath } from './auth.repository.js';

// Tenant e usuário vêm sempre da sessão (AD-010): todo filtro é a própria pessoa.
const own = (tenantId: string, userId: string) => tenantScoped({ Tenant: tenantId, _id: userId });

const toAccountView = (
  doc: { _id: { toString(): string }; name: string; avatarUpdatedAt?: Date } | null,
): AccountView | null =>
  doc
    ? {
        name: doc.name,
        ...(doc.avatarUpdatedAt ? { avatar: avatarPath(doc._id.toString(), doc.avatarUpdatedAt) } : {}),
      }
    : null;

export const updateName = async (tenantId: string, userId: string, name: string): Promise<AccountView | null> =>
  withDbTiming('account.updateName', async () =>
    toAccountView(
      await User.findOneAndUpdate(own(tenantId, userId), { $set: { name } }, { new: true })
        .select('name avatarUpdatedAt')
        .lean(),
    ),
  );

export const findPasswordHash = async (tenantId: string, userId: string): Promise<string | null> =>
  withDbTiming('account.findPasswordHash', async () => {
    const doc = await User.findOne(own(tenantId, userId)).select('password').lean();
    return doc?.password ?? null;
  });

// ACC-04: troca a senha e encerra as outras sessões; a atual (keepTokenHash) segue válida.
export const updatePassword = async (
  tenantId: string,
  userId: string,
  passwordHash: string,
  keepTokenHash: string,
): Promise<void> =>
  withDbTiming('account.updatePassword', async () => {
    await User.updateOne(own(tenantId, userId), { $set: { password: passwordHash } });
    await Session.deleteMany({ user: userId, tokenHash: { $ne: keepTokenHash } });
  });

export const setAvatar = async (tenantId: string, userId: string, image: string | null): Promise<AccountView | null> =>
  withDbTiming('account.setAvatar', async () =>
    toAccountView(
      await User.findOneAndUpdate(
        own(tenantId, userId),
        image
          ? { $set: { avatar: image, avatarUpdatedAt: new Date() } }
          : { $unset: { avatar: 1, avatarUpdatedAt: 1 } },
        { new: true },
      )
        .select('name avatarUpdatedAt')
        .lean(),
    ),
  );
