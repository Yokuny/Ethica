'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../lib/utils.js';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    // Alone, the table brings its own frame (bordered card). Inside the
    // app `DataTable` (`data-slot="data-table"`) the panel does the framing:
    // the table touches the edges, as in the reference data-grid.
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-lg border bg-card shadow-xs in-data-[slot=data-table]:rounded-none in-data-[slot=data-table]:border-0 in-data-[slot=data-table]:bg-transparent in-data-[slot=data-table]:shadow-none"
    >
      <table
        data-slot="table"
        // `border-separate`: the rule lives on the cell, not on the row, so it does not
        // leak past the table when it scrolls horizontally.
        className={cn('w-full caption-bottom border-separate border-spacing-0 font-sans text-xs', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      // Discreet header: gray label without a band, only the bottom rule, so the
      // data (and not the header) is the first read. `hover:bg-transparent`
      // on the <tr> cancels the TableRow hover — the header is not a clickable row.
      className={cn(
        'text-text-secondary [&>tr>th]:border-b [&>tr>th]:border-border/70 [&_tr]:hover:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('font-medium [&>tr>td]:border-t [&>tr>td]:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'transition-colors hover:bg-surface-secondary/80 has-aria-expanded:bg-surface-secondary/80 data-[state=selected]:bg-surface-raised [&:not(:last-child)>td]:border-b [&:not(:last-child)>td]:border-border/45',
        className,
      )}
      {...props}
    />
  );
}

type TableSort = { direction: 'asc' | 'desc' | false; onToggle?: React.MouseEventHandler<HTMLButtonElement> };

// Sortable column: pass `sort`; `aria-sort` and the arrow button come from here.
function TableHead({ className, sort, children, ...props }: React.ComponentProps<'th'> & { sort?: TableSort }) {
  const SortIcon = sort?.direction === 'asc' ? ArrowUp : sort?.direction === 'desc' ? ArrowDown : ChevronsUpDown;
  return (
    <th
      data-slot="table-head"
      aria-sort={
        sort ? (sort.direction === 'asc' ? 'ascending' : sort.direction === 'desc' ? 'descending' : 'none') : undefined
      }
      className={cn(
        'h-10 px-2 text-left align-middle font-caption text-[length:var(--caption-size)] font-medium uppercase tracking-[0.06em] whitespace-nowrap first:ps-4 last:pe-4 [&:has([role=checkbox])]:pe-0',
        className,
      )}
      {...props}
    >
      {sort ? (
        <button
          type="button"
          onClick={sort.onToggle}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 uppercase outline-none hover:text-impact focus-visible:text-impact',
            sort.direction && 'text-impact',
          )}
        >
          {children}
          <SortIcon aria-hidden className="size-3" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-2 py-1 align-middle whitespace-nowrap first:ps-4 last:pe-4 in-data-[slot=data-table]:h-12 has-data-[slot=table-identity]:whitespace-normal has-data-[slot=table-stack]:whitespace-normal [&:has([role=checkbox])]:pe-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 font-sans text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
