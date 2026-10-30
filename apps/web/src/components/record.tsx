import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { BadgeIndicator } from '@ethica/ui/components/badge';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Children, type ComponentProps, createContext, type ReactNode, useContext, useId } from 'react';

// Página de registro (AD-072, AD-090): o layout final dos modelos do
// iotlog-frontend-v2 (FAS, OS preenchida, OS concluída), em blocos empilhados:
//   1. RecordHeader — um ou mais pares rótulo em caixa alta + título grande
//      (RecordHeadingGroup), e à direita um segundo par ou o status;
//   2. RecordStats — faixa de destaques entre fios (em cima e embaixo), células
//      separadas por divisória vertical, rótulo em caixa alta e valor a 24px;
//   3. RecordTable — lista livre (checklist): título grande, linhas entre fios,
//      ícone de situação opcional e células rótulo-sobre-valor.
// A identidade toda mora aqui: a tela só escolhe os dados e não passa classe.
// Seções rótulo/valor ficam no ProductSpecs (AD-091).
// Todo texto é ItemTitle ou ItemDescription.

// Rótulo em caixa alta do cabeçalho e da faixa (o "ORDEM"/"ATIVO" do IOT).
const captionClass =
  'line-clamp-none font-caption font-medium text-[length:var(--caption-size)] uppercase tracking-[0.06em]';

// ─── 1. Cabeçalho ────────────────────────────────────────────────────────────

export function RecordHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="record-header"
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8', className)}
      {...props}
    />
  );
}

// Vários pares lado a lado à esquerda do cabeçalho (ex.: ordem + embarcação).
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
  // Selo em seguida do rótulo (ex.: "Atrasada" ao lado de "Tarefa").
  badge?: ReactNode;
  // Linha secundária ao lado do título (ex.: cidade - estado no modelo de OS).
  description?: ReactNode;
  // `end`: o par da direita do cabeçalho.
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
            // biome-ignore lint/a11y/useHeadingContent: o título chega como children do ItemTitle
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

// Estado do registro no lado direito do cabeçalho (modelo da OS preenchida).
export function RecordStatus({ variant, label, pulse = true }: RecordStatusProps) {
  return (
    <div data-slot="record-status" className="flex shrink-0 items-center gap-2">
      <BadgeIndicator variant={variant} pulse={pulse} />
      <ItemTitle className="text-2xl text-impact">{label}</ItemTitle>
    </div>
  );
}

// ─── 2. Faixa de destaques ───────────────────────────────────────────────────

// Por número de colunas (a partir de md).
const statsColumns: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

// `ruled` (padrão): faixa do registro no modelo do IOT — fios em cima e
// embaixo, divisória vertical entre células, rótulo em caixa alta, valor a 24px.
// `band`: faixa de indicadores das listagens (superfície cinza, sparkline,
// régua e tendência), sem divisórias.
type RecordStatsVariant = 'ruled' | 'band';

const StatsVariantContext = createContext<RecordStatsVariant>('ruled');

const statsVariantClass: Record<RecordStatsVariant, string> = {
  ruled:
    'grid-cols-1 gap-y-5 border-y py-6 sm:grid-cols-2 sm:gap-x-8 md:gap-x-0 md:[&>*]:px-8 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0 md:[&>*+*]:border-l',
  band: 'grid-cols-2 gap-x-6 gap-y-6 bg-surface-secondary px-4 py-5 md:gap-x-10',
};

type RecordStatsProps = ComponentProps<'div'> & {
  // Colunas a partir de `md`; padrão = número de células (até 5).
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
  // Complemento pequeno ao lado do valor (ex.: "94%").
  hint?: ReactNode;
  // Proporção (0 a 1) desenhada como régua de traços sob o valor.
  ratio?: number;
  // Série temporal compacta e direção calculada a partir de dados reais.
  sparkline?: number[];
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  // Regra que define o número (indicador de relatório).
  description?: ReactNode;
  // Bolinha de status antes do valor (cor do tenant ou variante semântica).
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
          // biome-ignore lint/suspicious/noArrayIndexKey: ticks são posições fixas
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

// Uma célula da faixa. Com `render={<Link …/>}` a célula inteira leva à lista que
// o número conta e o valor ganha o estilo de link do sistema (classe `link`) com ArrowUpRight.
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
        // Blocos (div), não spans: o nome acessível da célula-link separa
        // rótulo, valor e regra em vez de colar "Processos2".
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
  // Botões à direita do título.
  actions?: ReactNode;
  // Texto mostrado quando não há linhas.
  empty?: string;
  children?: ReactNode;
};

// Lista de itens do registro no modelo do checklist da OS concluída: título a
// 24px, linhas separadas por fio e, em cada linha, células rótulo sobre valor
// alinhadas em colunas (por isso é <table>).
export function RecordTable({ title, actions, empty, children }: RecordTableProps) {
  const headingId = useId();
  const hasRows = Children.toArray(children).length > 0;
  return (
    <section aria-labelledby={headingId} data-slot="record-table" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ItemTitle
          id={headingId}
          // biome-ignore lint/a11y/useHeadingContent: o título chega como children do ItemTitle
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
  // Ícone de situação à esquerda (RecordTableMedia); some no mobile.
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

// Círculo tingido com o ícone de situação da linha (feito / não feito).
export function RecordTableMedia({
  variant = 'neutral',
  label,
  children,
}: {
  variant?: keyof typeof mediaVariantClass;
  // Nome acessível da situação (o ícone sozinho não diz nada ao leitor de tela).
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

// Célula rótulo sobre valor. O valor pode ser texto, selo ou link.
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
