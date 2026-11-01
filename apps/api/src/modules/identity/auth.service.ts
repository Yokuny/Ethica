import { hashToken } from '@ethica/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as activityLogService from './activityLog.service.js';
import * as authRepository from './auth.repository.js';
import type { SessionView, SignIn, TenantUser, UpdatePermissions } from './auth.schema.js';

const SESSION_TTL_MS = 4 * 24 * 60 * 60 * 1000;

// Tudo que grava sessão é AWAITADO antes de devolver o token para o
// controller montar o cookie — corrige o `saveRefreshToken(...)` sem await
// da referência (Risk 5): sem isso, o cookie podia chegar ao cliente antes
// de a sessão existir no banco, e o primeiro /auth/session tomava 401.
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
  // Entrada no sistema vai ao diário de bordo (AD-134); quem não tem tenant (plataforma) não.
  if (user.tenant)
    void activityLogService.record({ tenantId: user.tenant, userId: user.id, module: 'account', action: 'signin' });

  return sessionToken;
};

// Sem validação do token de propósito: logout tem que funcionar mesmo com a
// sessão já expirada/revogada (o controller limpa o cookie de qualquer
// jeito). Quem tem o token já podia usá-lo — apagar a sessão dele não dá a
// ninguém acesso a mais nada.
export const signout = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  await authRepository.deleteSessionByTokenHash(hashToken(token));
};

// req.tenantUser já veio do banco (createAuthMiddleware — FND-05); aqui só
// enriquece com os campos de exibição (nome, e-mail, status) que o payload
// mínimo de TenantUser não carrega — outra leitura do banco, nunca do token.
export const getSessionView = async (tenantUser: TenantUser): Promise<SessionView> => {
  const user = await authRepository.findUserView(tenantUser.user);
  if (!user) throw new CustomError('invalid_session', 401, 'usuário não encontrado');

  const tenant = tenantUser.tenant ? await authRepository.findTenantView(tenantUser.tenant) : undefined;

  return { tenant: tenant ?? undefined, user, role: tenantUser.role, permissions: tenantUser.permissions };
};

// MOD-07: leitura em lote para outros módulos (order.getOrder — T13)
// resolverem nome de usuário sem uma segunda consulta por item.
export const findUserNamesByIds = authRepository.findUserNamesByIds;

// Diretório do tenant, usado pelo filtro de "responsável" da fila de
// conversas (inbox) — mesmo shape de findUserNamesByIds, sem o `$in` de ids.
export const listUsers = (tenantId: string, options: { activeOnly?: boolean } = {}) =>
  authRepository.listUsers(tenantId, options);

// AD-137: o admin ajusta a matriz de um membro; admin tem tudo e não tem matriz.
export const updatePermissions = async (tenantId: string, userId: string, data: UpdatePermissions) => {
  const target = await authRepository.findUserRole(tenantId, userId);
  if (!target) throw new CustomError('not_found', 404);
  if (target.includes('admin')) throw new CustomError('admin_has_all_permissions', 422);
  await authRepository.updatePermissions(tenantId, userId, data.permissions);
};

// REG-07 (AD-071): diretório completo para a tela de usuários (só admin).
export const listUserDirectory = (tenantId: string) => authRepository.listUserDirectory(tenantId);

// ACC-06: bytes da foto de um usuário do tenant.
export const getUserAvatar = async (tenantId: string, userId: string) => {
  const avatar = await authRepository.findUserAvatar(tenantId, userId);
  if (!avatar) throw new CustomError('not_found', 404);
  return avatar;
};

// MOD-04: outros módulos (conversation.service — T15) resolvem o nome de UM
// User (ex.: quem está com a conversa assumida) só por aqui, nunca pelo
// repository — mesmo shape de authRepository.findUserView.
export const findUserView = authRepository.findUserView;

// MOD-04/MOD-05 (T21): card.service.assertReferencesExist confirma a
// existência de um User (assignee) só por aqui, nunca com `User.exists`
// direto.
export const userExists = authRepository.userExists;

// ENR-07: elegibilidade de responsável (User ativo do mesmo tenant).
export const userIsActive = authRepository.userIsActive;
