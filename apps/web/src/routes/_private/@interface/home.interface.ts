import type { PermissionModule } from '@ethica/contracts';
import type { LucideIcon } from 'lucide-react';
export type HomeSection = {
  to:
    | '/expert-cases'
    | '/notifications'
    | '/field'
    | '/expert-reports'
    | '/parties'
    | '/court-divisions'
    | '/agenda'
    | '/dashboard'
    | '/finance'
    | '/automation'
    | '/reports'
    | '/users'
    | '/office'
    | '/activity-log';
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  // Matrix module that needs `view` (AD-137), or `admin`.
  // `everyone`: each person sees what their modules allow inside it (Notifications, AD-282).
  access: PermissionModule | 'admin' | 'everyone';
};
