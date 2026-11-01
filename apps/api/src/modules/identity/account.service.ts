import crypto from 'node:crypto';
import { hashToken } from '@ethica/db';
import bcrypt from 'bcrypt';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as accountRepository from './account.repository.js';
import type { AccountView, ChangePassword, UpdateProfile } from './account.schema.js';

const BCRYPT_ROUNDS = 10;

const found = (view: AccountView | null): AccountView => {
  if (!view) throw new CustomError('not_found', 404);
  return view;
};

export const getProfile = async (tenantId: string, userId: string): Promise<AccountView> =>
  found(await accountRepository.findProfile(tenantId, userId));

export const updateProfile = async (tenantId: string, userId: string, data: UpdateProfile): Promise<AccountView> =>
  found(await accountRepository.updateProfile(tenantId, userId, data));

export const changePassword = async (
  tenantId: string,
  userId: string,
  data: ChangePassword,
  currentTokenHash: string,
): Promise<void> => {
  const hash = await accountRepository.findPasswordHash(tenantId, userId);
  if (!hash) throw new CustomError('not_found', 404);
  if (!(await bcrypt.compare(data.currentPassword, hash))) throw new CustomError('wrong_current_password', 400);
  await accountRepository.updatePassword(
    tenantId,
    userId,
    await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS),
    currentTokenHash,
  );
};

export const setAvatar = async (tenantId: string, userId: string, image: string | null): Promise<AccountView> =>
  found(await accountRepository.setAvatar(tenantId, userId, image));

// PRZ-03: gera o link secreto do feed iCal. O token só existe nesta resposta; o banco guarda
// o hash. Gerar de novo substitui o anterior (revoga o link antigo).
export const gerarCalendarFeed = async (tenantId: string, userId: string): Promise<{ token: string }> => {
  const token = crypto.randomBytes(32).toString('hex');
  await accountRepository.setCalendarFeedTokenHash(tenantId, userId, hashToken(token));
  return { token };
};

export const revogarCalendarFeed = (tenantId: string, userId: string) =>
  accountRepository.setCalendarFeedTokenHash(tenantId, userId, null);

export const calendarFeedStatus = async (tenantId: string, userId: string) => ({
  active: await accountRepository.hasCalendarFeed(tenantId, userId),
});

export const findFeedOwner = (token: string) => accountRepository.findFeedOwner(hashToken(token));

export const listDeadlineReminderRecipients = (tenantIds: string[]) =>
  accountRepository.listDeadlineReminderRecipients(tenantIds);
