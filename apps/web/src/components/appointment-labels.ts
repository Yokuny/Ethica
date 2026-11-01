import { APPOINTMENT_STATUS, APPOINTMENT_TYPES, type AppointmentType } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

export const APPOINTMENT_TYPE_VARIANT: Record<AppointmentType, IndicatorVariant> = {
  inspection: 'violet',
  hearing: 'info',
  meeting: 'cyan',
  other: 'neutral',
};

export const APPOINTMENT_TYPE_ITEMS = APPOINTMENT_TYPES.map((value) => ({ value, label: t(value) }));
export const APPOINTMENT_STATUS_ITEMS = APPOINTMENT_STATUS.map((value) => ({ value, label: t(value) }));
