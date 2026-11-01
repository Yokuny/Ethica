import { numerarSecoes } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { TriangleAlert } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LaudoRecord } from '@/query/laudo.js';

type LaudoSecoesNavProps = { laudo: LaudoRecord; selecionada: string; onSelect: (secaoId: string) => void };

// Seções numeradas pela posição (AD-126); a que tem variável sem valor fica marcada (LAU-03.3).
export function LaudoSecoesNav({ laudo, selecionada, onSelect }: LaudoSecoesNavProps) {
  const numeros = numerarSecoes(laudo.secoes);
  const pendentes = new Set(laudo.pendencias.map((pendencia) => pendencia.secaoId));

  return (
    <nav aria-label={t('sections')} className="flex flex-col gap-0.5">
      {laudo.secoes.map((secao, i) => (
        <button
          key={secao.id}
          type="button"
          aria-current={secao.id === selecionada ? 'true' : undefined}
          onClick={() => onSelect(secao.id)}
          className={cn(
            'flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
            secao.id === selecionada && 'bg-accent',
            secao.nivel > 1 && 'pl-5',
            secao.nivel > 2 && 'pl-8',
          )}
        >
          <ItemDescription className="w-8 shrink-0 tabular-nums">{numeros[i]}</ItemDescription>
          <ItemTitle className="min-w-0 flex-1 font-normal">{secao.titulo}</ItemTitle>
          {pendentes.has(secao.id) && (
            <TriangleAlert aria-label={t('missing_values')} className="size-4 shrink-0 text-status-warning-indicator" />
          )}
        </button>
      ))}
    </nav>
  );
}
