import { Session, Tenant, tenantScoped, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  TenantView,
  UserAvatarImage,
  UserDirectoryEntry,
  UserForSignin,
  UserNameSummary,
  UserSummary,
  UserView,
} from './auth.schema.js';

// ACC-06: caminho da foto com a versão na query — a URL muda quando a foto muda,
// então a resposta da imagem pode ficar em cache para sempre.
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

// MOD-07: UMA consulta `$in` por lote — sem ids não há consulta alguma. Um id
// sem User correspondente (ou de outro tenant, AD-010) simplesmente fica de
// fora do array devolvido.
export const findUserNamesByIds = async (tenantId: string, ids: string[]): Promise<UserNameSummary[]> => {
  if (ids.length === 0) return [];

  return withDbTiming('auth.findUserNamesByIds', async () => {
    const users = await User.find(tenantScoped({ Tenant: tenantId, _id: { $in: ids } }))
      .select('name')
      .lean();
    return users.map((user) => ({ id: user._id.toString(), name: user.name }));
  });
};

// Diretório completo do tenant (sem filtro de ids) — usado pelo filtro de
// "responsável" da fila de conversas (inbox), que precisa oferecer TODA
// operadora do tenant como opção, não só as que já aparecem numa página de
// resultados. Ordenado por nome pra ficar estável e legível num <Select>.
export const listUsers = async (tenantId: string, options: { activeOnly?: boolean } = {}): Promise<UserSummary[]> =>
  withDbTiming('auth.listUsers', async () => {
    const users = await User.find(tenantScoped({ Tenant: tenantId, ...(options.activeOnly ? { active: true } : {}) }))
      .select('name avatarUpdatedAt')
      .sort({ name: 1 })
      .lean();
    return users.map((user) => ({ id: user._id.toString(), name: user.name, ...avatarOf(user) }));
  });

// REG-07 (AD-071): diretório da tela de usuários (admin) — mesmo tenant scope e
// ordem de listUsers, com e-mail, papel e situação. `select` explícito: a senha
// nunca sai do banco por aqui.
export const listUserDirectory = async (tenantId: string): Promise<UserDirectoryEntry[]> =>
  withDbTiming('auth.listUserDirectory', async () => {
    const users = await User.find(tenantScoped({ Tenant: tenantId }))
      .select('name email role active createdAt avatarUpdatedAt')
      .sort({ name: 1 })
      .lean();
    return users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      ...avatarOf(user),
    }));
  });

// ACC-06: a foto em si, só de alguém do mesmo tenant (AD-010).
export const findUserAvatar = async (tenantId: string, userId: string): Promise<UserAvatarImage | null> =>
  withDbTiming('auth.findUserAvatar', async () => {
    const user = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('+avatar')
      .lean();
    const match = user?.avatar?.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    return match ? { contentType: match[1] as string, data: Buffer.from(match[2] as string, 'base64') } : null;
  });

// MOD-04/MOD-05 (T21): outros módulos (card) confirmam a existência de um
// User só por aqui, nunca com `User.exists` direto — mesmo tenant scope de
// findUserView, sem trazer o documento inteiro.
// ENR-07: só um User ATIVO do tenant pode receber trabalho novo (responsável
// de Process/tarefa); quem foi desativado continua visível, mas não é elegível.
export const userIsActive = async (tenantId: string, id: string): Promise<boolean> =>
  withDbTiming('auth.userIsActive', async () =>
    Boolean(await User.exists(tenantScoped({ Tenant: tenantId, _id: id, active: true }))),
  );

export const userExists = async (tenantId: string, id: string): Promise<boolean> =>
  withDbTiming('auth.userExists', async () => Boolean(await User.exists(tenantScoped({ Tenant: tenantId, _id: id }))));

// Escrita da sessão sempre AWAITADA pelo chamador (service) — o cookie nunca
// pode chegar ao cliente antes de o registro existir no banco (Risk 5).
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
