import { type CreateInvite, PROFILE_PERMISSIONS } from '@ethica/contracts';

// The invite already starts with the chosen profile preset (AD-137).
export const DEFAULT_VALUES = {
  email: '',
  role: 'operator',
  permissions: PROFILE_PERMISSIONS.operator,
} satisfies CreateInvite;
