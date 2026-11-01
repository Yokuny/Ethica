import type { Permissoes } from './schemas/permissao.schema.js';

export type Role = 'admin' | 'manager' | 'operator';

export type TenantUser = {
  tenant?: string;
  user: string;
  role: Role[];
  isPlatformAdmin: boolean;
  // Matriz efetiva (AD-137), resolvida do banco a cada requisição.
  permissoes: Permissoes;
};
