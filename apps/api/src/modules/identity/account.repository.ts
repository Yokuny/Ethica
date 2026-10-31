import { Session, Tenant, tenantScoped, toObjectId, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { AccountView, DestinatarioAviso, FeedOwner } from './account.schema.js';
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

// PRZ-03: `null` revoga o link; um hash novo substitui (e assim revoga) o anterior.
export const setCalendarFeedTokenHash = async (tenantId: string, userId: string, tokenHash: string | null) =>
  withDbTiming('account.setCalendarFeedTokenHash', async () => {
    await User.updateOne(
      own(tenantId, userId),
      tokenHash ? { $set: { calendarFeedTokenHash: tokenHash } } : { $unset: { calendarFeedTokenHash: 1 } },
    );
  });

export const hasCalendarFeed = async (tenantId: string, userId: string): Promise<boolean> =>
  withDbTiming('account.hasCalendarFeed', async () => {
    const doc = await User.findOne(own(tenantId, userId)).select('calendarFeedTokenHash').lean();
    return Boolean(doc?.calendarFeedTokenHash);
  });

// Rota pública do feed: o token é a única credencial. Usuário inativo, sem papel ou de
// tenant suspenso (AD-098) não tem dono — o feed responde 404.
export const findFeedOwner = async (tokenHash: string): Promise<FeedOwner | null> =>
  withDbTiming('account.findFeedOwner', async () => {
    const user = await User.findOne({ calendarFeedTokenHash: tokenHash, active: true, 'role.0': { $exists: true } })
      .select('Tenant')
      .lean();
    if (!user?.Tenant) return null;
    const tenant = await Tenant.findById(user.Tenant).select('status').lean();
    if (!tenant || tenant.status === 'suspended') return null;
    return { userId: user._id.toString(), tenantId: user.Tenant.toString() };
  });

// AD-110: usuários ativos com papel e aviso ligado (ausente = ligado), de tenants não suspensos.
export const listDestinatariosAvisoPrazo = async (tenantIds: string[]): Promise<DestinatarioAviso[]> =>
  withDbTiming('account.listDestinatariosAvisoPrazo', async () => {
    if (tenantIds.length === 0) return [];
    const ativos = await Tenant.find({ _id: { $in: tenantIds.map(toObjectId) }, status: { $ne: 'suspended' } })
      .select('_id')
      .lean();
    const users = await User.find({
      Tenant: { $in: ativos.map((tenant) => tenant._id) },
      active: true,
      'role.0': { $exists: true },
      'preferences.avisoPrazoEmail': { $ne: false },
    })
      .select('Tenant name email')
      .lean();
    return users.map((user) => ({ tenantId: String(user.Tenant), name: user.name, email: user.email }));
  });
