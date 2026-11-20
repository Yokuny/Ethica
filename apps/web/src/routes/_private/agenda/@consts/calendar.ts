import type { AppointmentType, CalendarEntryType } from '@ethica/contracts';

export const ALL_FILTER_VALUE = '__all__';
export const CALENDAR_VIEWS = ['day', 'week', 'month'] as const;
export const DEFAULT_VIEW = 'month';
export const DEFAULT_DURATION_MINUTES = 60;

// The color of a calendar item comes only from its type (nobody picks it): the chip and the
// legend dot in the type filter. On the dark-surfaced themes (AD-237) the chip is a translucent 400.
export const TYPE_COLORS: Record<AppointmentType | CalendarEntryType, { chip: string; dot: string }> = {
  inspection: {
    chip: 'bg-violet-200/50 text-violet-950/80 hover:bg-violet-200/70 dark:bg-violet-400/20 dark:text-violet-100 dark:hover:bg-violet-400/30',
    dot: 'bg-violet-400',
  },
  hearing: {
    chip: 'bg-sky-200/50 text-sky-950/80 hover:bg-sky-200/70 dark:bg-sky-400/20 dark:text-sky-100 dark:hover:bg-sky-400/30',
    dot: 'bg-sky-400',
  },
  meeting: {
    chip: 'bg-cyan-200/50 text-cyan-950/80 hover:bg-cyan-200/70 dark:bg-cyan-400/20 dark:text-cyan-100 dark:hover:bg-cyan-400/30',
    dot: 'bg-cyan-400',
  },
  other: {
    chip: 'bg-zinc-200/60 text-zinc-900/80 hover:bg-zinc-200/80 dark:bg-zinc-400/20 dark:text-zinc-100 dark:hover:bg-zinc-400/30',
    dot: 'bg-zinc-400',
  },
  deadline: {
    chip: 'bg-amber-200/50 text-amber-950/80 hover:bg-amber-200/70 dark:bg-amber-400/20 dark:text-amber-100 dark:hover:bg-amber-400/30',
    dot: 'bg-amber-400',
  },
  income: {
    chip: 'bg-emerald-200/50 text-emerald-950/80 hover:bg-emerald-200/70 dark:bg-emerald-400/20 dark:text-emerald-100 dark:hover:bg-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  receipt: {
    chip: 'bg-teal-200/50 text-teal-950/80 hover:bg-teal-200/70 dark:bg-teal-400/20 dark:text-teal-100 dark:hover:bg-teal-400/30',
    dot: 'bg-teal-400',
  },
  expense: {
    chip: 'bg-rose-200/50 text-rose-950/80 hover:bg-rose-200/70 dark:bg-rose-400/20 dark:text-rose-100 dark:hover:bg-rose-400/30',
    dot: 'bg-rose-400',
  },
};
