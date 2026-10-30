import type { LucideIcon } from 'lucide-react';
export type HomeSection = {
  to: '/pericias' | '/agenda' | '/financeiro' | '/prospeccao' | '/users';
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  access: 'everyone' | 'finance' | 'admin';
};
