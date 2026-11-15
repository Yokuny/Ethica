import type { AppointmentType, CalendarEntryType } from '@ethica/contracts';

export const ALL_FILTER_VALUE = '__all__';
export const CALENDAR_VIEWS = ['day', 'week', 'month'] as const;
export const DEFAULT_VIEW = 'month';
export const DEFAULT_DURATION_MINUTES = 60;

// The color of a calendar item comes only from its type (nobody picks it): the chip and the
// legend dot in the type filter.
export const TYPE_COLORS: Record<AppointmentType | CalendarEntryType, { chip: string; dot: string }> = {
  inspection: { chip: 'bg-violet-200/50 text-violet-950/80 hover:bg-violet-200/70', dot: 'bg-violet-400' },
  hearing: { chip: 'bg-sky-200/50 text-sky-950/80 hover:bg-sky-200/70', dot: 'bg-sky-400' },
  meeting: { chip: 'bg-cyan-200/50 text-cyan-950/80 hover:bg-cyan-200/70', dot: 'bg-cyan-400' },
  other: { chip: 'bg-zinc-200/60 text-zinc-900/80 hover:bg-zinc-200/80', dot: 'bg-zinc-400' },
  deadline: { chip: 'bg-amber-200/50 text-amber-950/80 hover:bg-amber-200/70', dot: 'bg-amber-400' },
  income: { chip: 'bg-emerald-200/50 text-emerald-950/80 hover:bg-emerald-200/70', dot: 'bg-emerald-400' },
  receipt: { chip: 'bg-teal-200/50 text-teal-950/80 hover:bg-teal-200/70', dot: 'bg-teal-400' },
  expense: { chip: 'bg-rose-200/50 text-rose-950/80 hover:bg-rose-200/70', dot: 'bg-rose-400' },
};
