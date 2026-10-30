import type { LancamentoNatureza } from '@ethica/contracts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@ethica/ui/components/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CategoriaTotal } from '@/query/lancamento.js';

// Total por categoria de uma natureza (receitas ou despesas), maior primeiro.
export function CategoriasChart({ natureza, data }: { natureza: LancamentoNatureza; data: CategoriaTotal[] }) {
  const config = {
    totalCents: { label: t('total'), color: natureza === 'receita' ? 'var(--chart-1)' : 'var(--destructive)' },
  } satisfies ChartConfig;
  const rows = data.map((row) => ({ categoria: t(row.categoria), totalCents: row.totalCents }));
  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="categoria" type="category" tickLine={false} axisLine={false} width={140} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel valueFormatter={formatMoney} />} />
        <Bar dataKey="totalCents" fill="var(--color-totalCents)" radius={3} barSize={16} />
      </BarChart>
    </ChartContainer>
  );
}
