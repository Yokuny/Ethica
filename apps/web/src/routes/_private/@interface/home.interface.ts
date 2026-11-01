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
    | '/office';
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  access: 'everyone' | 'finance' | 'admin';
};
