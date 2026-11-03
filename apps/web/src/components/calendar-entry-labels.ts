import {
  CALENDAR_ENTRY_TYPES,
  type CalendarEntryStatus,
  type CalendarEntryType,
  FINANCE_ENTRY_TYPES,
} from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

// Agenda entries sent by the other modules (AD-169). The type key is the value itself.
export const calendarEntryTypeItems = (canSeeFinance: boolean) =>
  CALENDAR_ENTRY_TYPES.filter((type) => canSeeFinance || !FINANCE_ENTRY_TYPES.includes(type)).map((value) => ({
    value,
    label: t(value),
  }));

// What the entry says beside the title once it is no longer open (AEV-03): paid, filed, missed, canceled.
export const calendarEntryStatusLabel = (type: CalendarEntryType, status: CalendarEntryStatus): string | undefined => {
  if (status === 'open' || type === 'receipt') return undefined;
  if (status === 'done') return type === 'deadline' ? t('filed') : t('paid');
  return status === 'missed' ? t('missed') : t('canceled');
};
