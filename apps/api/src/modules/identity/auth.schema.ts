import type { Permissoes, SignIn, TenantUser, UpdatePermissoes } from '@ethica/contracts';
import { idSchema, signinSchema, updatePermissoesSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { Permissoes, SignIn, TenantUser, UpdatePermissoes };
// MOD-08: schemas de entrada e tipos do módulo num lugar só.
export { signinSchema, updatePermissoesSchema };

// Diretório do tenant. `active=true` devolve só quem pode receber trabalho novo
// (seletor de responsável); sem ele a lista traz também os inativos, que ainda
// aparecem em filtros de dados antigos.
export const listUsersQuerySchema = z.object({ active: z.enum(['true', 'false']).optional() }).strict();
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// REG-07 (AD-071): diretório completo, só admin — sem parâmetros.
export const userDirectoryQuerySchema = z.object({}).strict();

// ACC-06: foto de um usuário do tenant da sessão.
export const userIdParamSchema = z.object({ id: idSchema }).strict();

export type AuthRouterDeps = { validToken: RequestHandler };

export type UserForSignin = {
  id: string;
  tenant?: string;
  password: string;
  active: boolean;
};

// `avatar`: caminho versionado da foto (ACC-06), ausente sem foto.
export type UserView = { id: string; name: string; email: string; avatar?: string };

export type TenantView = { id: string; name: string; status: string };

export type SessionView = {
  tenant?: { id: string; name: string; status: string };
  user: UserView;
  role: TenantUser['role'];
  // Matriz efetiva (AD-137): o web esconde o que a API vai recusar.
  permissoes: Permissoes;
};

// MOD-07: leitura em lote para outros módulos (order, conversation, card)
// resolverem nome de usuário (ex.: quem aprovou/rejeitou um Order) sem uma
// segunda consulta por item.
export type UserNameSummary = { id: string; name: string };

// Diretório para seletores e para achar a foto do responsável no front (ACC-06).
export type UserSummary = UserNameSummary & { avatar?: string };

export type UserAvatarImage = { contentType: string; data: Buffer };

// REG-07 (AD-071): linha do diretório de usuários da tela de admin. Nunca
// carrega senha nem dado de sessão.
export type UserDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: TenantUser['role'];
  // Matriz efetiva (AD-137): admin com tudo, membro com a gravada ou o preset do perfil.
  permissoes: Permissoes;
  active: boolean;
  // ISO 8601 (UTC): quando a pessoa entrou no time.
  createdAt: string;
  avatar?: string;
};
