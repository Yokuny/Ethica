import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { CSSProperties } from 'react';
import { Time12h } from '@/components/time12h.js';
import { cn } from '@/lib/utils.js';
import type { CompromissoRecord } from '@/query/compromisso.js';
import type { PrazoRecord } from '@/query/prazo.js';

// Cor por tipo de compromisso; cancelado esmaece e concluído fica esmaecido.
const tipoClasses: Record<CompromissoRecord['tipo'], string> = {
  inspection: 'border-violet-500/30 bg-violet-50 text-violet-900',
  hearing: 'border-sky-500/30 bg-sky-50 text-sky-900',
  meeting: 'border-cyan-500/30 bg-cyan-50 text-cyan-900',
  other: 'bg-background',
};

export type CalendarEventChipProps = {
  item: CompromissoRecord;
  onSelect: (item: CompromissoRecord) => void;
  // 'timed': intervalo de horário completo (dia/semana). 'compact': uma linha (mês e "+N").
  variant?: 'timed' | 'compact';
  className?: string;
  style?: CSSProperties;
};

export function CalendarEventChip({ item, onSelect, variant = 'timed', className, style }: CalendarEventChipProps) {
  return (
    <button
      type="button"
      data-testid={`calendar-event-${item.id}`}
      onClick={() => onSelect(item)}
      style={style}
      className={cn(
        'rounded-sm border text-left text-xs',
        variant === 'compact' ? 'w-full truncate px-1.5 py-0.5' : 'overflow-hidden p-1.5',
        tipoClasses[item.tipo],
        item.status === 'canceled' && 'border-muted-foreground/30 bg-muted text-muted-foreground line-through',
        item.status === 'done' && 'opacity-60',
        className,
      )}
    >
      {variant === 'timed' ? (
        <>
          <ItemTitle>
            <Time12h value={item.inicio} /> · <Time12h value={item.fim} />
          </ItemTitle>
          <ItemDescription className="text-inherit line-clamp-1">{item.titulo}</ItemDescription>
        </>
      ) : (
        <ItemDescription className="text-inherit line-clamp-none">
          <Time12h value={item.inicio} /> {item.titulo}
        </ItemDescription>
      )}
    </button>
  );
}

// Prazo pendente (AD-109): evento de dia inteiro, sem horário; vencido fica em vermelho.
export function CalendarPrazoChip({
  prazo,
  today,
  onSelect,
}: {
  prazo: PrazoRecord;
  today: string;
  onSelect: (prazo: PrazoRecord) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`calendar-prazo-${prazo.id}`}
      onClick={() => onSelect(prazo)}
      className={cn(
        'w-full truncate rounded-sm border px-1.5 py-0.5 text-left text-xs',
        'border-amber-500/40 bg-amber-50 text-amber-900',
        prazo.vencimento < today && 'border-destructive bg-destructive/10 text-destructive',
      )}
    >
      <ItemDescription className="text-inherit line-clamp-none">
        {prazo.titulo}
        {prazo.periciaNumero ? ` · ${prazo.periciaNumero}` : ''}
      </ItemDescription>
    </button>
  );
}
