import type { UpdateAvatar, UpdateProfile } from '@ethica/contracts';
import { updateAvatarSchema, updateProfileSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { UpdateAvatar, UpdateProfile };
export { updateAvatarSchema, updateProfileSchema };

export type AccountRouterDeps = { validToken: RequestHandler };

// ACC-06: `avatar` is the versioned photo path (GET /auth/users/:id/avatar?v=…),
// missing when the person has no photo. DOC-01: professional data, missing when empty.
export type AccountView = {
  name: string;
  avatar?: string;
  cpf?: string;
  professionalRegistration?: string;
  education?: string;
  // Only the technical responsible has one (AD-162); goes in the report footer (AD-206).
  phone?: string;
};

// PRZ-03: owner of the iCal feed link — active user, with a role, from a non-suspended tenant.
export type FeedOwner = { userId: string; tenantId: string };

// AD-110: who gets the daily deadline reminder.
export type NoticeRecipient = { tenantId: string; name: string; email: string };
