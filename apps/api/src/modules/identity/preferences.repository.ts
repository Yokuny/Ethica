import { HOME_BLOCOS, type HomeBloco } from '@ethica/contracts';
import { tenantScoped, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { UpdatePreferences, UserPreferences } from './preferences.schema.js';

const toPreferences = (
  doc: {
    preferences?: { onboardingDismissed?: boolean; deadlineReminderEmail?: boolean; blocosOcultos?: string[] };
  } | null,
): UserPreferences => ({
  onboardingDismissed: doc?.preferences?.onboardingDismissed === true,
  deadlineReminderEmail: doc?.preferences?.deadlineReminderEmail !== false,
  // Chave que deixou de existir é ignorada (AD-136).
  blocosOcultos: (doc?.preferences?.blocosOcultos ?? []).filter((bloco): bloco is HomeBloco =>
    (HOME_BLOCOS as readonly string[]).includes(bloco),
  ),
});

// Usuário sem o campo (conta anterior à feature) lê o default, sem backfill.
export const findPreferences = async (tenantId: string, userId: string): Promise<UserPreferences | null> =>
  withDbTiming('preferences.findPreferences', async () => {
    const doc = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('preferences')
      .lean();
    return doc ? toPreferences(doc) : null;
  });

// $set por chave: uma preferência nova no futuro não apaga as outras.
export const updatePreferences = async (
  tenantId: string,
  userId: string,
  data: UpdatePreferences,
): Promise<UserPreferences | null> =>
  withDbTiming('preferences.updatePreferences', async () => {
    const doc = await User.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: userId }),
      {
        $set: Object.fromEntries(
          Object.entries(data)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [`preferences.${key}`, value]),
        ),
      },
      { new: true },
    )
      .select('preferences')
      .lean();
    return doc ? toPreferences(doc) : null;
  });
