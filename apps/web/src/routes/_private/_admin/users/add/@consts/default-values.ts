import { type CreateInvite, PERFIL_PERMISSOES } from '@ethica/contracts';

// O convite já nasce com o preset do perfil escolhido (AD-137).
export const DEFAULT_VALUES = {
  email: '',
  role: 'operator',
  permissoes: PERFIL_PERMISSOES.operator,
} satisfies CreateInvite;
