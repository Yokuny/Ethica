export type Role = 'admin' | 'manager' | 'operator';

export type TenantUser = {
  tenant?: string;
  user: string;
  role: Role[];
  isPlatformAdmin: boolean;
};
