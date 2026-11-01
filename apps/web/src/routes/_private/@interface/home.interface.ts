import type { PermissaoModulo } from '@ethica/contracts';
import type { LucideIcon } from 'lucide-react';
export type HomeSection = {
  to:
    | '/expert-cases'
    | '/field'
    | '/expert-reports'
    | '/parties'
    | '/agenda'
    | '/finance'
    | '/prospecting'
    | '/reports'
    | '/users'
    | '/office'
    | '/activity-log';
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  // Módulo da matriz que precisa de `ver` (AD-137), ou `admin`.
  access: PermissaoModulo | 'admin';
};
