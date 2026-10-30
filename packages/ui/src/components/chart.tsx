import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../lib/utils.js';

// Molde do `chart` do shadcn sobre recharts 3: o `config` dá rótulo e cor a cada
// série; a cor vira a variável `--color-<chave>` dentro do container, e o
// gráfico usa `fill="var(--color-<chave>)"`. As cores vêm dos tokens do tema
// (`--chart-1..5`, `--destructive`…), nunca hex solto na tela.
export type ChartConfig = Record<string, { label: React.ReactNode; color?: string; icon?: React.ComponentType }>;

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart precisa estar dentro de <ChartContainer />');
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;
  const style = Object.fromEntries(
    Object.entries(config).flatMap(([key, item]) => (item.color ? [[`--color-${key}`, item.color]] : [])),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        style={style}
        className={cn(
          'flex aspect-video justify-center text-xs',
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
          '[&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border',
          '[&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden',
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipItem = {
  name?: string | number;
  value?: number | string | Array<number | string>;
  dataKey?: string | number | ((obj: unknown) => unknown);
  color?: string;
  fill?: string;
  payload?: Record<string, unknown> & { fill?: string };
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  // Chave do `config` usada para o nome de cada linha (padrão: o `dataKey`/`name`).
  nameKey?: string;
  labelFormatter?: (label: React.ReactNode) => React.ReactNode;
  valueFormatter?: (value: number) => React.ReactNode;
};

function itemKey(item: TooltipItem, nameKey?: string) {
  if (nameKey && item.payload && typeof item.payload[nameKey] === 'string') return item.payload[nameKey] as string;
  if (typeof item.dataKey === 'string') return item.dataKey;
  return String(item.name ?? 'value');
}

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel,
  nameKey,
  labelFormatter,
  valueFormatter,
}: ChartTooltipContentProps) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!hideLabel && label !== undefined && (
        <div className="font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = itemKey(item, nameKey);
          const entry = config[key];
          const color = item.payload?.fill ?? item.color ?? item.fill;
          return (
            <div key={key} className="flex w-full items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
              <span className="flex-1 text-muted-foreground">{entry?.label ?? item.name}</span>
              {typeof item.value === 'number' && (
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {valueFormatter ? valueFormatter(item.value) : item.value.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = {
  payload?: readonly { value?: unknown; dataKey?: unknown; color?: string }[];
  nameKey?: string;
  className?: string;
};

function ChartLegendContent({ payload, className }: ChartLegendContentProps) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 pt-3', className)}>
      {payload.map((item) => {
        // Na pizza todas as fatias têm o mesmo `dataKey`: o nome da fatia (`value`) é que identifica.
        const key = String(item.value ?? item.dataKey ?? 'value');
        const entry = config[key] ?? config[String(item.dataKey)];
        return (
          <div key={key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            {entry?.label ?? String(item.value)}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent };
