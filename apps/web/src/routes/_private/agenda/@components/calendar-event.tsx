import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { CSSProperties } from 'react';
import { Time12h } from '@/components/time12h.js';
import { isPastInstant } from '@/lib/helpers/displayTime.helper.js';
import { cn } from '@/lib/utils.js';
import type { CompromissoRecord } from '@/query/compromisso.js';

// Cor por tipo de compromisso; cancelado esmaece, concluído fica verde e um
// prazo ainda agendado que já passou é destacado como vencido.
const tipoClasses: Record<CompromissoRecord['tipo'], string> = {
  vistoria: 'border-violet-500/30 bg-violet-50 text-violet-900',
  audiencia: 'border-sky-500/30 bg-sky-50 text-sky-900',
  prazo: 'border-amber-500/40 bg-amber-50 text-amber-900',
  reuniao: 'border-cyan-500/30 bg-cyan-50 text-cyan-900',
  outro: 'bg-background',
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
  const isOverdue = item.status === 'agendado' && item.tipo === 'prazo' && isPastInstant(item.fim);

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
        item.status === 'cancelado' && 'border-muted-foreground/30 bg-muted text-muted-foreground line-through',
        item.status === 'concluido' && 'opacity-60',
        isOverdue && 'border-destructive bg-destructive/10 text-destructive',
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
