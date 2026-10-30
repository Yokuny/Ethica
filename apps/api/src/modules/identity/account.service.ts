import bcrypt from 'bcrypt';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as accountRepository from './account.repository.js';
import type { AccountView, ChangePassword } from './account.schema.js';

const BCRYPT_ROUNDS = 10;

const found = (view: AccountView | null): AccountView => {
  if (!view) throw new CustomError('not_found', 404);
  return view;
};

export const updateProfile = async (tenantId: string, userId: string, name: string): Promise<AccountView> =>
  found(await accountRepository.updateName(tenantId, userId, name));

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
