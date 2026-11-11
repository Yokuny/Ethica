import { Avatar, AvatarFallback } from '@ethica/ui/components/avatar';
import { Badge, type IndicatorVariant } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { InputGroup, InputGroupInput } from '@ethica/ui/components/input-group';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { Separator } from '@ethica/ui/components/separator';
import type { LinkProps } from '@tanstack/react-router';
import { cn } from 'cn';
import { Check, ChevronLeft, ChevronRight, EllipsisVertical, ListFilter, type LucideIcon, Search } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { AppLink } from '@/components/app-link.js';
import { t } from '@/lib/helpers/translate.helper.js';

type DataTableProps = React.ComponentProps<'div'> & {
  // Free search: frameless field at the top of the table, as in the reference.
  search?: { value: string; onChange: (value: string) => void };
  // "Filtros" button: several filters (`items`) or a single one (`options`).
  filters?: TableFiltersProps;
  // Extra controls on the same line (e.g. the queue quick filters).
  toolbar?: React.ReactNode;
};

const ALL = '__all__';

type TableFilterOption = { value: string; label: string };

type TableFilterOptions = {
  label: string;
  items: TableFilterOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
};

// One filter of the "Filtros" list (FIL-01): options to check, several at once (FIL-03), or own fields
// (number, period) with the `summary` of what is applied (FIL-04).
export type TableFilterItem = { label: string; disabled?: boolean } & (
  | { items: TableFilterOption[]; value?: string[]; onChange: (value: string[] | undefined) => void }
  | { summary?: string; content: React.ReactNode }
);

type TableFiltersProps = { items: TableFilterItem[]; options?: never } | { options: TableFilterOptions; items?: never };

// What the filter row shows on the right: the option when one, how many when several.
function filterSummary(filter: TableFilterItem): string | undefined {
  if ('content' in filter) return filter.summary;
  const value = filter.value ?? [];
  if (value.length > 1) return String(value.length);
  return filter.items.find((item) => item.value === value[0])?.label ?? value[0];
}

// Summary of a period filter: "01/11 – 30/11", "01/11 – …" (dates `YYYY-MM-DD`).
export function periodSummary(from?: string, to?: string): string | undefined {
  if (!from && !to) return undefined;
  const short = (date?: string) => (date ? date.split('-').reverse().slice(0, 2).join('/') : '…');
  return `${short(from)} – ${short(to)}`;
}

// Long lists (states, cities, people) get a search box above the options.
const SEARCHABLE_FROM = 8;

// Options of one filter: search, a check per option and "Limpar" (FIL-02).
function TableFilterChecklist({
  items,
  value = [],
  onChange,
}: {
  items: TableFilterOption[];
  value?: string[];
  onChange: (value: string[] | undefined) => void;
}) {
  const [term, setTerm] = useState('');
  const normalized = term.trim().toLocaleLowerCase('pt-BR');
  const visible = normalized
    ? items.filter((item) => item.label.toLocaleLowerCase('pt-BR').includes(normalized))
    : items;
  const toggle = (option: string) => {
    const next = value.includes(option) ? value.filter((item) => item !== option) : [...value, option];
    onChange(next.length ? next : undefined);
  };
  return (
    <>
      {items.length >= SEARCHABLE_FROM && (
        <div className="p-1 pb-0">
          <InputGroup className="h-8 rounded-lg border-input/30 bg-input/30 shadow-none">
            <Search aria-hidden />
            <InputGroupInput
              autoFocus
              aria-label={t('search')}
              placeholder={t('search')}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </InputGroup>
        </div>
      )}
      <div className="no-scrollbar max-h-72 overflow-y-auto p-1">
        {visible.length ? (
          visible.map((item) => {
            const checked = value.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => toggle(item.value)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input',
                    checked && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {checked && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            );
          })
        ) : (
          <ItemDescription className="px-2 py-1.5">{t('not_found')}</ItemDescription>
        )}
      </div>
      {value.length > 0 && (
        <>
          <Separator />
          <Button variant="ghost" size="sm" className="m-1 justify-center" onClick={() => onChange(undefined)}>
            {t('clear')}
          </Button>
        </>
      )}
    </>
  );
}

// "Filtros" button. Several filters (`items`, FIL-01) open as a short list; a click on one shows its options or
// fields, with a back arrow (FIL-02). A single one (`options`, AD-193) opens its values right away, "Todos" first,
// the chosen one checked. Used by `DataTable` and by screens without a table (kanban, reports).
function TableFilters({ items, options }: TableFiltersProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const count = options ? (options.value ? 1 : 0) : items.filter((filter) => filterSummary(filter)).length;
  const label = (
    <>
      <ListFilter />
      {t('filters')}
      {Boolean(count) && <Badge variant="secondary">{count}</Badge>}
    </>
  );
  if (options) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" />}>{label}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{options.label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={options.value ?? ALL}
              onValueChange={(next) => options.onChange(next === ALL ? undefined : String(next))}
            >
              {[{ value: ALL, label: t('all') }, ...options.items].map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  const filter = current === null ? undefined : items[current];
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCurrent(null);
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" />}>{label}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] gap-0 rounded-xl p-1">
        {filter ? (
          <>
            <button
              type="button"
              onClick={() => setCurrent(null)}
              className="flex w-full cursor-pointer items-center gap-1 rounded-sm px-1 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <ChevronLeft aria-hidden className="size-4 text-muted-foreground" />
              <ItemDescription className="font-medium text-foreground">{filter.label}</ItemDescription>
              <span className="sr-only">{t('back')}</span>
            </button>
            {'content' in filter ? (
              <div className="flex flex-col gap-3 p-2">{filter.content}</div>
            ) : (
              <TableFilterChecklist items={filter.items} value={filter.value} onChange={filter.onChange} />
            )}
          </>
        ) : (
          <div className="p-1">
            {items.map((item, index) => {
              const summary = filterSummary(item);
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => setCurrent(index)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="flex-1">{item.label}</span>
                  {summary && <span className="max-w-32 truncate text-muted-foreground text-xs">{summary}</span>}
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
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
  TableFilters,
  TableIconText,
  TableIdentity,
  TableRowAction,
  TableRowActions,
  TableStack,
  TableStatus,
};
