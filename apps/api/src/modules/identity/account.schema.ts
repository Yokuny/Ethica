import type { ChangePassword, UpdateAvatar, UpdateProfile } from '@ethica/contracts';
import { changePasswordSchema, updateAvatarSchema, updateProfileSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { ChangePassword, UpdateAvatar, UpdateProfile };
export { changePasswordSchema, updateAvatarSchema, updateProfileSchema };

export type AccountRouterDeps = { validToken: RequestHandler };

// ACC-06: `avatar` is the versioned photo path (GET /auth/users/:id/avatar?v=…),
// missing when the person has no photo. DOC-01: professional data, missing when empty.
export type AccountView = {
  name: string;
  avatar?: string;
  cpf?: string;
  professionalRegistration?: string;
  education?: string;
};

// PRZ-03: owner of the iCal feed link — active user, with a role, from a non-suspended tenant.
export type FeedOwner = { userId: string; tenantId: string };

// AD-110: who gets the daily deadline reminder.
export type NoticeRecipient = { tenantId: string; name: string; email: string };
