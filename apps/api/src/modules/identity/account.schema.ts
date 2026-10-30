import type { ChangePassword, UpdateAvatar, UpdateProfile } from '@ethica/contracts';
import { changePasswordSchema, updateAvatarSchema, updateProfileSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { ChangePassword, UpdateAvatar, UpdateProfile };
export { changePasswordSchema, updateAvatarSchema, updateProfileSchema };

export type AccountRouterDeps = { validToken: RequestHandler };

// ACC-06: `avatar` é o caminho versionado da foto (GET /auth/users/:id/avatar?v=…),
// ausente quando a pessoa não tem foto.
export type AccountView = { name: string; avatar?: string };
