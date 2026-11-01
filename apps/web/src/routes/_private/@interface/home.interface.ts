import type { PermissaoModulo } from '@ethica/contracts';
import type { LucideIcon } from 'lucide-react';
export type HomeSection = {
  to:
    | '/pericias'
    | '/campo'
    | '/laudos'
    | '/partes'
    | '/agenda'
    | '/financeiro'
    | '/prospeccao'
    | '/relatorios'
    | '/users'
    | '/office'
    | '/diario';
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  // Módulo da matriz que precisa de `ver` (AD-137), ou `admin`.
  access: PermissaoModulo | 'admin';
};
