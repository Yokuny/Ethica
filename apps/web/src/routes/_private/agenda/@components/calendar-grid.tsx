import { cn } from 'cn';
import type * as React from 'react';

// Agenda calendar grids (day/week and month views). Same
// dashed language as item.tsx: the frame and ALL inner lines come
// from here, the route only composes and passes layout (min width, columns, position).
// Each inner line is drawn only once by whoever comes after it
// (right / bottom cell) and the edge lines fall on the frame
// itself — never a cell bordered on all four sides, which would double the
// line between two neighbors. As in ItemGroup, the direct children whose
// lines come from the parent carry no border utility at all (not even `border-0`):
// it would tie in specificity with the `[&>*]` selectors and the CSS order
// would decide who paints.

// Hour grid frame. Scrolls horizontally on a narrow screen; `className`
// goes to the inner content (typically the min width).
function CalendarTimeGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-card shadow-xs">
      <div data-slot="calendar-time-grid" className={cn('flex', className)} {...props} />
    </div>
  );
}

// Day columns side by side, with a vertical line to the left of each.
function CalendarTimeGridColumns({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="calendar-time-grid-columns"
      className={cn('grid flex-1 [&>*]:border-l [&>*]:border-border', className)}
      {...props}
    />
  );
}

// Header of a column (weekday/date) — and the spacer above the
// hours column, so the bottom line crosses the whole grid.
function CalendarTimeGridHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="calendar-time-grid-header"
      className={cn('flex h-10 flex-col items-center justify-center border-b border-border text-center', className)}
      {...props}
    />
  );
}

// Line of an hour inside a column body (positioned by the caller
// through `style.top`). Hour 00 gets no line: the header already draws it.
function CalendarTimeGridHourLine({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="calendar-time-grid-hour-line"
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 border-t border-border', className)}
      {...props}
    />
  );
}

// Month grid: 7 columns, weekday header + cells. A line on the
// right of every cell that does not close the row (7n) and on top of every cell
// from the second row on (n+8).
function CalendarMonthGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="calendar-month-grid"
      className={cn(
        'grid w-full grid-cols-7 overflow-hidden rounded-lg border bg-card shadow-xs',
        '[&>*:not(:nth-child(7n))]:border-r [&>*:nth-child(n+8)]:border-t [&>*]:border-border',
        className,
      )}
      {...props}
    />
  );
}

// Cell of a day in the month grid; `outside` fades the days of the
// previous/next month that complete the first/last week.
function CalendarMonthCell({ className, outside, ...props }: React.ComponentProps<'div'> & { outside?: boolean }) {
  return (
    <div
      data-slot="calendar-month-cell"
      className={cn('flex min-h-24 flex-col gap-1 p-1', outside && 'bg-muted/40 text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  CalendarMonthCell,
  CalendarMonthGrid,
  CalendarTimeGrid,
  CalendarTimeGridColumns,
  CalendarTimeGridHeader,
  CalendarTimeGridHourLine,
};
