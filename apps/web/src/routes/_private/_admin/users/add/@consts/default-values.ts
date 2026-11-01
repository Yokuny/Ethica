import { type CreateInvite, PROFILE_PERMISSIONS } from '@ethica/contracts';

// O convite já nasce com o preset do perfil escolhido (AD-137).
export const DEFAULT_VALUES = {
  email: '',
  role: 'operator',
  permissions: PROFILE_PERMISSIONS.operator,
} satisfies CreateInvite;
