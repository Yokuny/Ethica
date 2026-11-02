import crypto from 'node:crypto';
import { hashToken } from '@ethica/db';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as accountRepository from './account.repository.js';
import type { AccountView, UpdateProfile } from './account.schema.js';

const found = (view: AccountView | null): AccountView => {
  if (!view) throw new CustomError('not_found', 404);
  return view;
};

export const getProfile = async (tenantId: string, userId: string): Promise<AccountView> =>
  found(await accountRepository.findProfile(tenantId, userId));

export const updateProfile = async (tenantId: string, userId: string, data: UpdateProfile): Promise<AccountView> =>
  found(await accountRepository.updateProfile(tenantId, userId, data));

export const setAvatar = async (tenantId: string, userId: string, image: string | null): Promise<AccountView> =>
  found(await accountRepository.setAvatar(tenantId, userId, image));

// PRZ-03: generates the secret iCal feed link. The token only exists in this response; the database keeps
// the hash. Generating again replaces the previous one (revokes the old link).
export const generateCalendarFeed = async (tenantId: string, userId: string): Promise<{ token: string }> => {
  const token = crypto.randomBytes(32).toString('hex');
  await accountRepository.setCalendarFeedTokenHash(tenantId, userId, hashToken(token));
  return { token };
};

export const revokeCalendarFeed = (tenantId: string, userId: string) =>
  accountRepository.setCalendarFeedTokenHash(tenantId, userId, null);

export const calendarFeedStatus = async (tenantId: string, userId: string) => ({
  active: await accountRepository.hasCalendarFeed(tenantId, userId),
});

export const findFeedOwner = (token: string) => accountRepository.findFeedOwner(hashToken(token));

export const listDeadlineReminderRecipients = (tenantIds: string[]) =>
  accountRepository.listDeadlineReminderRecipients(tenantIds);
