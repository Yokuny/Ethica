import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as preferencesRepository from './preferences.repository.js';
import type { UpdatePreferences, UserPreferences } from './preferences.schema.js';

// Tenant e usuário vêm sempre da sessão (AD-010); a pessoa só lê e grava a
// PRÓPRIA preferência — não existe id de usuário em rota nem em corpo.
export const getPreferences = async (tenantId: string, userId: string): Promise<UserPreferences> => {
  const preferences = await preferencesRepository.findPreferences(tenantId, userId);
  if (!preferences) throw new CustomError('not_found', 404);
  return preferences;
};

export const updatePreferences = async (
  tenantId: string,
  userId: string,
  data: UpdatePreferences,
): Promise<UserPreferences> => {
  const preferences = await preferencesRepository.updatePreferences(tenantId, userId, data);
  if (!preferences) throw new CustomError('not_found', 404);
  return preferences;
};
