import { Avatar, AvatarFallback } from '@ethica/ui/components/avatar';
import { Badge, type IndicatorVariant } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { InputGroup, InputGroupInput } from '@ethica/ui/components/input-group';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Separator } from '@ethica/ui/components/separator';
import type { LinkProps } from '@tanstack/react-router';
import { cn } from 'cn';
import { EllipsisVertical, ListFilter, type LucideIcon, Search } from 'lucide-react';
import type * as React from 'react';
import { AppLink } from '@/components/app-link.js';
import { t } from '@/lib/helpers/translate.helper.js';

type DataTableProps = React.ComponentProps<'div'> & {
  // Free search: frameless field at the top of the table, as in the reference.
  search?: { value: string; onChange: (value: string) => void };
  // Advanced filters: they live in a popover opened by "Filtros"; `active` is the
  // number of applied filters.
  filters?: { content: React.ReactNode; active?: number };
  // Extra controls on the same line (e.g. the queue quick filters).
  toolbar?: React.ReactNode;
};

type TableFiltersProps = { content: React.ReactNode; active?: number };

// "Filtros" button that opens the controls in a popover. Used by `DataTable` and
// by screens without a table (kanban, reports) to keep the same gesture.
function TableFilters({ content, active }: TableFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" />}>
        <ListFilter />
        {t('filters')}
        {Boolean(active) && <Badge variant="secondary">{active}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3">
        {content}
      </PopoverContent>
    </Popover>
  );
}

const ALL = '__all__';

type TableFilterSelectProps = {
  label: string;
  items: { value: string; label: string }[];
  value?: string;
  onChange: (value: string | undefined) => void;
  // "Todos" first, which clears the filter; `false` when the filter always has a value.
  all?: boolean;
};

// One labeled select of the "Filtros" popover.
function TableFilterSelect({ label, items, value, onChange, all = true }: TableFilterSelectProps) {
  const options = all ? [{ value: ALL, label: t('all') }, ...items] : items;
  return (
    <div className="grid gap-1.5">
      <ItemDescription>{label}</ItemDescription>
      <Select
        items={options}
        value={value ?? ALL}
        onValueChange={(next) => onChange(!next || next === ALL ? undefined : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Default listing panel: one toolbar line (Filters + search), a rule, and the
// table flush with the edges. The `Table*` of `@ethica/ui` and `TablePagination`
// lose their own frame in here (`in-data-[slot=data-table]`). Loading
// and empty state get breathing room; the table does not.
function DataTable({ search, filters, toolbar, className, children, ...props }: DataTableProps) {
  const hasToolbar = Boolean(search || filters || toolbar);
  return (
    <div data-slot="data-table" className={cn('min-w-0 overflow-hidden', className)} {...props}>
      {hasToolbar && (
        <>
          <div data-slot="data-table-toolbar" className="flex min-w-0 flex-wrap items-center gap-2 px-4 py-2">
            {filters && <TableFilters {...filters} />}
            {search && (
              <InputGroup className="max-w-72 flex-1">
                <Search aria-hidden />
                <InputGroupInput
                  aria-label={t('search')}
                  placeholder={t('search')}
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                />
              </InputGroup>
            )}
            {toolbar}
          </div>
          <Separator />
        </>
      )}
      <div data-slot="data-table-content" className="p-4 has-data-[slot=table-container]:p-0">
        {children}
      </div>
    </div>
  );
}

// ─── Cell content ────────────────────────────────────────────────────────────
// From the user's model rows (`line.html`, `premium line.html`): the
// main column is identity (avatar or icon + title + supporting line),
// the others are a value with a 12px supporting line, a soft status badge and the
// ⋮ menu at the end. The screen composes the columns only with these pieces.

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}` : (words[0]?.slice(0, 2) ?? '');
  return letters.toUpperCase() || '?';
}

type TableIdentityProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  // Person or company: avatar with the initials of this name.
  avatar?: string;
  // Thing (task, process, product): gray tile with the icon.
  icon?: LucideIcon;
  // Extra destination (e.g. the order's customer): the title becomes a `<Link/>` and the click
  // on it does not reach the row, which opens its own record.
  link?: LinkProps;
  size?: 'default' | 'sm';
};

function TableIdentity({ title, description, avatar, icon: Icon, link, size = 'default' }: TableIdentityProps) {
  return (
    // Column widths (AD-182): the title (process number, name) never wraps nor gets cut, so the column takes
    // its width and the long texts of the other columns wrap; only a title past `max-w-md` ends in "…".
    // The supporting line wraps.
    <div data-slot="table-identity" className="flex items-center gap-2.5">
      {avatar !== undefined && (
        <Avatar size={size}>
          <AvatarFallback>{initials(avatar)}</AvatarFallback>
        </Avatar>
      )}
      {Icon && (
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
            size === 'sm' ? 'size-6 [&>svg]:size-3.5' : 'size-8 [&>svg]:size-4',
          )}
        >
          <Icon />
        </span>
      )}
      <div className="min-w-0">
        {link ? (
          <AppLink {...link} className="max-w-md whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
            {title}
          </AppLink>
        ) : (
          <ItemTitle className="block max-w-md truncate font-normal text-left">{title}</ItemTitle>
        )}
        {description && <ItemDescription className="max-w-md text-xs text-pretty">{description}</ItemDescription>}
      </div>
    </div>
  );
}

type TableStackProps = {
  children: React.ReactNode;
  description?: React.ReactNode;
  // `muted`: the value is secondary (date, code); `error`: delay, failure.
  tone?: 'default' | 'muted' | 'error';
  descriptionTone?: 'muted' | 'error';
  // Width of a long-text column, so the wrapped columns of a list end at the same number of lines.
  className?: string;
};

// Value + supporting line (date and time, total and quantity, status and time). Shown whole (AD-182): long
// text (parties, court) wraps inside `max-w-md` instead of being cut; dates and amounts have no space to wrap at.
function TableStack({
  children,
  description,
  tone = 'default',
  descriptionTone = 'muted',
  className,
}: TableStackProps) {
  return (
    <div data-slot="table-stack" className={cn('max-w-md', className)}>
      <ItemDescription
        className={cn(
          'line-clamp-none text-pretty',
          tone === 'default' && 'text-foreground',
          tone === 'error' && 'text-destructive',
        )}
      >
        {children}
      </ItemDescription>
      {description && (
        <ItemDescription
          className={cn('text-[0.8rem] line-clamp-none text-pretty', descriptionTone === 'error' && 'text-destructive')}
        >
          {description}
        </ItemDescription>
      )}
    </div>
  );
}

// Icon + discreet text (channel, phone, payment method).
function TableIconText({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div data-slot="table-icon-text" className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <ItemDescription className="line-clamp-none whitespace-nowrap">{children}</ItemDescription>
    </div>
  );
}

type TableStatusProps = {
  children: React.ReactNode;
  variant?: IndicatorVariant;
  // Status color configurable by the tenant (`StatusOption` hex).
  color?: string;
  className?: string;
};

// Soft badge with a dot. Domain statuses use `variant`; tenant statuses,
// `color` — the background becomes the same color at 12%.
function TableStatus({ children, variant = 'neutral', color, className }: TableStatusProps) {
  const style = color
    ? ({
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      } as React.CSSProperties)
    : undefined;
  return (
    <Badge variant={color ? 'outline' : variant} style={style} className={cn('gap-1.5 px-2 ring-0', className)}>
      {children}
    </Badge>
  );
}

const stopRowClick = { onClick: (event: React.MouseEvent) => event.stopPropagation() };

// Row ⋮ menu. Does not propagate the click to the row (which opens the record);
// each action is a `TableRowAction` (with `render={<Link/>}` when it navigates).
function TableRowActions({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...stopRowClick} />}
        >
          <EllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40" {...stopRowClick}>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const TableRowAction = (props: React.ComponentProps<typeof DropdownMenuItem>) => <DropdownMenuItem {...props} />;

export {
  DataTable,
  TableFilterSelect,
  TableFilters,
  TableIconText,
  TableIdentity,
  TableRowAction,
  TableRowActions,
  TableStack,
  TableStatus,
};
