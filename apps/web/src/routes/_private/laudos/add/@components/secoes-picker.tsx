import type { LaudoVariante } from '@ethica/contracts';
import { numerarSecoes } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { cn } from 'cn';
import { Checkbox } from '@/components/checkbox.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ModeloSecaoRecord } from '@/query/laudo.js';

export type Escolhas = Record<string, LaudoVariante | undefined>;

type SecoesPickerProps = {
  secoes: ModeloSecaoRecord[];
  escolhas: Escolhas;
  onChange: (escolhas: Escolhas) => void;
};

// "O que deve constar" (LAU-02.1): marcar as seções e escolher o texto "sim" ou "não".
export function SecoesPicker({ secoes, escolhas, onChange }: SecoesPickerProps) {
  const numeros = numerarSecoes(secoes);
  const marcadas = secoes.filter((secao) => escolhas[secao.id]).length;

  return (
    <Panel
      title={t('what_the_report_contains')}
      description={`${marcadas} ${t('of')} ${secoes.length} ${t('sections').toLowerCase()}`}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => onChange(Object.fromEntries(secoes.map((secao) => [secao.id, escolhas[secao.id] ?? 'yes'])))}
          >
            {t('select_all')}
          </Button>
          <Button variant="outline" onClick={() => onChange({})}>
            {t('clear_selection')}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {secoes.map((secao, i) => {
          const variante = escolhas[secao.id];
          return (
            <li
              key={secao.id}
              className={cn(
                'flex flex-wrap items-center gap-3 py-2',
                secao.nivel > 1 && 'pl-6',
                secao.nivel > 2 && 'pl-12',
              )}
            >
              <Checkbox
                checked={Boolean(variante)}
                onCheckedChange={(checked) => onChange({ ...escolhas, [secao.id]: checked ? 'yes' : undefined })}
                aria-label={secao.titulo}
                labelClassName="normal-case tracking-normal"
                label={
                  <span className="flex flex-col">
                    <ItemTitle>
                      {numeros[i]}. {secao.titulo}
                    </ItemTitle>
                    {secao.apenasTitulo && <ItemDescription>{t('title_only')}</ItemDescription>}
                  </span>
                }
              />
              {variante && !secao.apenasTitulo && (
                <ToggleGroup
                  value={variante}
                  onValueChange={(value) => onChange({ ...escolhas, [secao.id]: value as LaudoVariante })}
                  className="ml-auto"
                >
                  <ToggleGroupItem value="yes" tone="success">
                    {t('yes')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="no" tone="neutral">
                    {t('no')}
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
