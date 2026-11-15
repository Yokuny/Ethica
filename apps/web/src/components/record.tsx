import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { BadgeIndicator } from '@ethica/ui/components/badge';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Children, type ComponentProps, createContext, type ReactNode, useContext, useId } from 'react';

// Record page (AD-072, AD-090): the final layout of the
// iotlog-frontend-v2 models (FAS, filled work order, completed work order), in stacked blocks:
//   1. RecordHeader — one or more uppercase label + large title pairs
//      (RecordHeadingGroup), and on the right a second pair or the status;
//   2. RecordStats — highlight strip between rules (top and bottom), cells
//      split by a vertical divider, uppercase label and value at 24px;
//   3. RecordTable — free list (checklist): large title, rows between rules,
//      optional state icon and label-over-value cells.
// The whole identity lives here: the screen only picks the data and passes no class.
// Label/value sections stay in ProductSpecs (AD-091).
// Every text is ItemTitle or ItemDescription.

// Uppercase label of the header and the strip (the IOT "ORDEM"/"ATIVO").
const captionClass =
  'line-clamp-none font-caption font-medium text-[length:var(--caption-size)] uppercase tracking-[0.06em]';

// ─── 1. Header ───────────────────────────────────────────────────────────────

export function RecordHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="record-header"
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8', className)}
      {...props}
    />
  );
}

// Several pairs side by side on the left of the header (e.g. order + vessel).
export function RecordHeadingGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="record-heading-group"
      className={cn('flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:gap-8', className)}
      {...props}
    />
  );
}

type RecordHeadingProps = {
  label: string;
  title: ReactNode;
  icon?: ReactNode;
  // Badge right after the label (e.g. "Atrasada" next to "Tarefa").
  badge?: ReactNode;
  // Secondary line next to the title (e.g. city - state in the work order model).
  description?: ReactNode;
  // `end`: the header's right pair.
  align?: 'start' | 'end';
};

export function RecordHeading({ label, title, icon, badge, description, align = 'start' }: RecordHeadingProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-4', align === 'end' && 'sm:justify-end sm:text-right')}>
      {icon && (
        <span aria-hidden className="shrink-0 text-muted-foreground [&_svg]:size-8">
          {icon}
        </span>
      )}
      <div className={cn('flex min-w-0 flex-col gap-1', align === 'end' && 'sm:items-end')}>
        <div className={cn('flex flex-wrap items-center gap-2', align === 'end' && 'sm:justify-end')}>
          <ItemDescription className={captionClass}>{label}</ItemDescription>
          {badge}
        </div>
        <div className={cn('flex flex-wrap items-baseline gap-x-4 gap-y-1', align === 'end' && 'sm:justify-end')}>
          <ItemTitle
            // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
            render={<h2 />}
            className="text-2xl text-impact"
          >
            {title}
          </ItemTitle>
          {description && <ItemDescription className="line-clamp-none">{description}</ItemDescription>}
        </div>
      </div>
    </div>
  );
}

type RecordStatusProps = {
  variant: ComponentProps<typeof BadgeIndicator>['variant'];
  label: string;
  pulse?: boolean;
};

// Record state on the right side of the header (filled work order model).
export function RecordStatus({ variant, label, pulse = true }: RecordStatusProps) {
  return (
    <div data-slot="record-status" className="flex shrink-0 items-center gap-2">
      <BadgeIndicator variant={variant} pulse={pulse} />
      <ItemTitle className="text-2xl text-impact">{label}</ItemTitle>
    </div>
  );
}

// ─── 2. Highlight strip ──────────────────────────────────────────────────────

// By number of columns (from md up).
const statsColumns: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

// `ruled` (default): record strip in the IOT model — rules on top and
// bottom, vertical divider between cells, uppercase label, value at 24px.
// `band`: listing indicator strip (gray surface, sparkline,
// ruler and trend), without dividers.
type RecordStatsVariant = 'ruled' | 'band';

const StatsVariantContext = createContext<RecordStatsVariant>('ruled');

const statsVariantClass: Record<RecordStatsVariant, string> = {
  ruled:
    'grid-cols-1 gap-y-5 border-y py-6 sm:grid-cols-2 sm:gap-x-8 md:gap-x-0 md:[&>*]:px-8 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0 md:[&>*+*]:border-l',
  band: 'grid-cols-2 gap-x-6 gap-y-6 bg-surface-secondary px-4 py-5 md:gap-x-10',
};

type RecordStatsProps = ComponentProps<'div'> & {
  // Columns from `md` up; default = number of cells (up to 5).
  columns?: 1 | 2 | 3 | 4 | 5;
  variant?: RecordStatsVariant;
};

export function RecordStats({ columns, variant = 'ruled', className, children, ...props }: RecordStatsProps) {
  const count = Math.max(1, Math.min(Children.toArray(children).length, 5)) as 1 | 2 | 3 | 4 | 5;
  return (
    <StatsVariantContext.Provider value={variant}>
      <div
        data-slot="record-stats"
        data-variant={variant}
        className={cn('grid', statsVariantClass[variant], statsColumns[columns ?? count], className)}
        {...props}
      >
        {children}
      </div>
    </StatsVariantContext.Provider>
  );
}

type RecordStatProps = Omit<useRender.ComponentProps<'div'>, 'children'> & {
  label: string;
  value: ReactNode;
  headerAction?: ReactNode;
  // Small complement next to the value (e.g. "94%").
  hint?: ReactNode;
  // Ratio (0 to 1) drawn as a dash ruler under the value.
  ratio?: number;
  // Compact time series and direction calculated from real data.
  sparkline?: number[];
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  // Rule that defines the number (report indicator).
  description?: ReactNode;
  // Status dot before the value (tenant color or semantic variant).
  dot?: Pick<ComponentProps<typeof BadgeIndicator>, 'color' | 'variant'>;
};

const RULER_TICKS = 36;

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 24 - ((value - min) / range) * 20;
    return `${x},${y}`;
  });
  const lastY = 24 - ((values[values.length - 1] - min) / range) * 20;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="h-7 w-full overflow-visible text-impact"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="100" cy={lastY} r="1.5" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Trend({ direction, label }: { direction: NonNullable<RecordStatProps['trend']>; label?: string }) {
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  return (
    <ItemDescription
      aria-label={label ?? direction}
      role="img"
      className={cn(
        'line-clamp-none',
        'inline-flex shrink-0 items-center justify-center rounded-sm p-0.5 [&_svg]:size-3.5',
        direction === 'up' && 'bg-status-success text-status-success-foreground',
        direction === 'down' && 'bg-destructive/10 text-destructive',
        direction === 'stable' && 'bg-muted',
      )}
    >
      <Icon />
    </ItemDescription>
  );
}

function Ruler({ ratio }: { ratio: number }) {
  const value = Math.min(Math.max(ratio, 0), 1);
  const filled = Math.round(value * RULER_TICKS);
  return (
    <div aria-hidden className="relative flex h-4 items-end justify-between gap-[3px] pt-1">
      {Array.from({ length: RULER_TICKS }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: ticks are fixed positions
          key={index}
          className={cn('h-2 w-px shrink-0', index < filled ? 'bg-impact' : 'bg-border')}
        />
      ))}
      <span
        className="absolute top-0 -translate-x-1/2 border-x-[4px] border-t-[5px] border-x-transparent border-t-impact"
        style={{ left: `${value * 100}%` }}
      />
    </div>
  );
}

// One strip cell. With `render={<Link …/>}` the whole cell leads to the list the
// number counts and the value gets the system link style (`link` class) with ArrowUpRight.
export function RecordStat({
  label,
  value,
  headerAction,
  hint,
  ratio,
  sparkline,
  trend,
  trendLabel,
  description,
  dot,
  render,
  className,
  ...props
}: RecordStatProps) {
  const variant = useContext(StatsVariantContext);
  const ruled = variant === 'ruled';
  const isLink = Boolean(render);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        className: cn(
          'group/stat flex min-w-0 flex-col',
          ruled ? 'gap-1.5' : 'gap-2',
          isLink && 'rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
          className,
        ),
        // Blocks (div), not spans: the accessible name of the link cell separates
        // label, value and rule instead of gluing "Processos2".
        children: (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <ItemDescription className={ruled ? captionClass : 'text-foreground'}>{label}</ItemDescription>
                {trend && <Trend direction={trend} label={trendLabel} />}
              </div>
              {headerAction}
            </div>
            <div className="flex items-baseline gap-2">
              <ItemTitle
                className={cn(
                  ruled ? 'text-2xl leading-tight' : 'text-[1.4rem] leading-none font-normal tracking-tight',
                  isLink ? 'link' : 'text-impact',
                )}
              >
                {dot && <BadgeIndicator {...dot} />}
                {value}
                {isLink && <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />}
              </ItemTitle>
              {hint && <ItemDescription className="text-xs line-clamp-none">{hint}</ItemDescription>}
            </div>
            {ratio !== undefined && <Ruler ratio={ratio} />}
            {sparkline && <Sparkline values={sparkline} />}
            {description && <ItemDescription className="line-clamp-none">{description}</ItemDescription>}
          </>
        ),
      },
      props,
    ),
  });
}

// ─── 3. Lista livre (checklist) ──────────────────────────────────────────────

type RecordTableProps = {
  title: string;
  // Buttons to the right of the title.
  actions?: ReactNode;
  // Text shown when there are no rows.
  empty?: string;
  children?: ReactNode;
};

// List of record items in the completed work order checklist model: title at
// 24px, rows separated by a rule and, in each row, label-over-value cells
// aligned in columns (that is why it is a <table>).
export function RecordTable({ title, actions, empty, children }: RecordTableProps) {
  const headingId = useId();
  const hasRows = Children.toArray(children).length > 0;
  return (
    <section aria-labelledby={headingId} data-slot="record-table" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ItemTitle
          id={headingId}
          // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
          render={<h2 />}
          className="text-lg text-impact"
        >
          {title}
        </ItemTitle>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {hasRows ? (
        <div className="overflow-x-auto">
          <table aria-labelledby={headingId} className="w-full border-separate border-spacing-0">
            <tbody>{children}</tbody>
          </table>
        </div>
      ) : (
        empty && <ItemDescription className="line-clamp-none border-y py-4">{empty}</ItemDescription>
      )}
    </section>
  );
}

type RecordTableRowProps = ComponentProps<'tr'> & {
  // State icon on the left (RecordTableMedia); hidden on mobile.
  media?: ReactNode;
};

export function RecordTableRow({ media, className, children, ...props }: RecordTableRowProps) {
  return (
    <tr
      data-slot="record-table-row"
      className={cn(
        'transition-colors hover:bg-accent/50 [&:not(:last-child)>td]:border-b [&>td]:px-4 [&>td]:py-4 [&>td]:align-top',
        props.onClick && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      {media && <td className="hidden w-16 md:table-cell">{media}</td>}
      {children}
    </tr>
  );
}

const mediaVariantClass = {
  success: 'border-status-success-border bg-status-success text-status-success-foreground',
  warning: 'border-status-warning-border bg-status-warning text-status-warning-foreground',
  error: 'border-status-error-border bg-status-error text-status-error-foreground',
  info: 'border-status-info-border bg-status-info text-status-info-foreground',
  neutral: 'border-status-neutral-border bg-status-neutral text-status-neutral-foreground',
} as const;

// Tinted circle with the row's state icon (done / not done).
export function RecordTableMedia({
  variant = 'neutral',
  label,
  children,
}: {
  variant?: keyof typeof mediaVariantClass;
  // Accessible name of the state (the icon alone says nothing to the screen reader).
  label: string;
  children: ReactNode;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('grid size-8 place-items-center rounded-full border [&_svg]:size-4', mediaVariantClass[variant])}
    >
      {children}
    </span>
  );
}

type RecordTableCellProps = Omit<ComponentProps<'td'>, 'children'> & {
  label: string;
  value: ReactNode;
};

// Label-over-value cell. The value can be text, a badge or a link.
export function RecordTableCell({ label, value, className, ...props }: RecordTableCellProps) {
  return (
    <td data-slot="record-table-cell" className={cn('min-w-32', className)} {...props}>
      <div className="flex flex-col gap-1">
        <ItemDescription className="line-clamp-none">{label}</ItemDescription>
        <ItemTitle>{value}</ItemTitle>
      </div>
    </td>
  );
}
