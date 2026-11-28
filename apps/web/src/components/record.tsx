import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { BadgeIndicator } from '@ethica/ui/components/badge';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Children, type ComponentProps, createContext, type ReactNode, useContext } from 'react';

// Record page (AD-072, AD-090): the final layout of the
// iotlog-frontend-v2 models (FAS, filled work order, completed work order), in stacked blocks:
//   1. RecordHeader — one or more uppercase label + large title pairs
//      (RecordHeadingGroup), and on the right a second pair or the status;
//   2. RecordStats — highlight strip between rules (top and bottom), cells side by side
//      (AD-292), uppercase label and value at 24px.
// Label/value sections are ProductSpecs inside a Panel of a PanelGroup (AD-312); lists are Item/ItemGroup in the
// page (AD-296).
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
        // Icon tile: muted square, rounded, the icon centered in the title color.
        <span
          aria-hidden
          className="flex aspect-square w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-impact sm:w-16 [&_svg]:size-5 sm:[&_svg]:size-6"
        >
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
            // A long unbroken title (a pasted address, a test string) wraps instead of pushing past the screen.
            className="text-2xl text-impact wrap-anywhere"
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

// `ruled` (default): record strip in the IOT model — rules on top and
// bottom, uppercase label, value at 24px. Columns come from the number of cells so the rows always
// balance (4 → 2+2, 5 → 3+2, 6 → 3+3) and only go to one line where it fits (AD-292).
// `band`: listing indicator strip (gray surface, sparkline,
// ruler and trend), without dividers; the same uppercase label and 24px value as the record strip.
type RecordStatsVariant = 'ruled' | 'band';

const StatsVariantContext = createContext<RecordStatsVariant>('ruled');

const statsVariantClass: Record<RecordStatsVariant, string> = {
  ruled: 'gap-x-8 gap-y-5 border-y py-6',
  band: 'gap-x-6 gap-y-6 bg-surface-secondary px-4 py-5 md:gap-x-8',
};

type RecordStatsProps = ComponentProps<'div'> & {
  variant?: RecordStatsVariant;
};

// By number of cells and by the width the strip really has (container, not viewport: the open sidebar counts);
// past 6 they stay in rows of 3.
const statsColumns = [
  '',
  '',
  '@lg:grid-cols-2',
  '@lg:grid-cols-3',
  '@lg:grid-cols-2 @3xl:grid-cols-4',
  '@lg:grid-cols-3 @4xl:grid-cols-5',
  '@lg:grid-cols-3 @6xl:grid-cols-6',
];

export function RecordStats({ variant = 'ruled', className, children, ...props }: RecordStatsProps) {
  const count = Children.toArray(children).length;
  // The gray band keeps two cells per row on a phone; an odd last cell takes the whole row.
  const phone =
    variant === 'band' && count > 1
      ? cn('grid-cols-2', count % 2 && '[&>*:last-child]:col-span-2 @lg:[&>*:last-child]:col-span-1')
      : 'grid-cols-1';
  return (
    <StatsVariantContext.Provider value={variant}>
      <div className="@container">
        <div
          data-slot="record-stats"
          data-variant={variant}
          className={cn(
            'grid',
            phone,
            statsColumns[Math.min(count, 6)] || '@lg:grid-cols-3',
            statsVariantClass[variant],
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </StatsVariantContext.Provider>
  );
}

type RecordStatProps = Omit<useRender.ComponentProps<'div'>, 'children'> & {
  label: string;
  value: ReactNode;
  headerAction?: ReactNode;
  // Small complement (e.g. "+12%"): inside the trend chip when there is a trend, otherwise next to the value.
  hint?: ReactNode;
  // Ratio (0 to 1) drawn as a dash ruler under the value.
  ratio?: number;
  // Compact time series and direction calculated from real data.
  sparkline?: number[];
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  // Whether the direction is good or bad (expenses going up is bad); default: up is good, down is bad.
  trendTone?: 'good' | 'bad' | 'neutral';
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

function Trend({
  direction,
  label,
  hint,
  tone = direction === 'up' ? 'good' : direction === 'down' ? 'bad' : 'neutral',
}: {
  direction: NonNullable<RecordStatProps['trend']>;
  label?: string;
  hint?: ReactNode;
  tone?: RecordStatProps['trendTone'];
}) {
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  return (
    <ItemDescription
      aria-label={[label ?? direction, typeof hint === 'string' ? hint : undefined].filter(Boolean).join(' ')}
      role="img"
      className={cn(
        'line-clamp-none',
        'inline-flex shrink-0 items-center justify-center gap-0.5 rounded-sm p-0.5 text-xs whitespace-nowrap [&_svg]:size-3.5',
        hint && 'pr-1',
        tone === 'good' && 'bg-status-success text-status-success-foreground',
        tone === 'bad' && 'bg-destructive/10 text-destructive',
        tone === 'neutral' && 'bg-muted',
      )}
    >
      <Icon />
      {hint}
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
  trendTone,
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
                <ItemDescription className={captionClass}>{label}</ItemDescription>
                {trend && <Trend direction={trend} label={trendLabel} hint={hint} tone={trendTone} />}
              </div>
              {headerAction}
            </div>
            {/* Wraps instead of overflowing: in a narrow cell the hint goes to the next line, never over the value. */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
              <ItemTitle
                className={cn(
                  ruled ? 'text-2xl leading-tight wrap-anywhere' : 'text-2xl leading-none tracking-tight',
                  isLink ? 'link' : 'text-impact',
                )}
              >
                {dot && <BadgeIndicator {...dot} />}
                {value}
                {isLink && <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />}
              </ItemTitle>
              {hint && !trend && (
                <ItemDescription className="text-xs line-clamp-none whitespace-nowrap">{hint}</ItemDescription>
              )}
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
