import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as preferencesRepository from './preferences.repository.js';
import type { UpdatePreferences, UserPreferences } from './preferences.schema.js';

// Tenant and user always come from the session (AD-010); the person only reads and writes
// THEIR OWN preference — there is no user id in the route or body.
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
