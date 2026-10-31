import type { ChangePassword, UpdateAvatar, UpdateProfile } from '@ethica/contracts';
import { changePasswordSchema, updateAvatarSchema, updateProfileSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { ChangePassword, UpdateAvatar, UpdateProfile };
export { changePasswordSchema, updateAvatarSchema, updateProfileSchema };

export type AccountRouterDeps = { validToken: RequestHandler };

// ACC-06: `avatar` é o caminho versionado da foto (GET /auth/users/:id/avatar?v=…),
// ausente quando a pessoa não tem foto.
export type AccountView = { name: string; avatar?: string };

// PRZ-03: dono do link do feed iCal — usuário ativo, com papel, de tenant não suspenso.
export type FeedOwner = { userId: string; tenantId: string };

// AD-110: quem recebe o aviso diário de prazos.
export type DestinatarioAviso = { tenantId: string; name: string; email: string };
