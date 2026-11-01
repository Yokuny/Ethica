import { Button } from '@ethica/ui/components/button';
import { ItemTitle } from '@ethica/ui/components/item';
import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Bloco repetível do registro: um item por linha, com remover e adicionar.
export function FieldList({
  titulo,
  vazio,
  actions,
  itens,
}: {
  titulo: string;
  vazio: string;
  actions: ReactNode;
  itens: Array<{ key: string; conteudo: ReactNode; onRemove: () => void }>;
}) {
  return (
    <Panel title={titulo} actions={actions}>
      {!itens.length ? (
        <ItemTitle className="font-normal text-muted-foreground">{vazio}</ItemTitle>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {itens.map((item) => (
            <li key={item.key} className="flex items-start gap-2 py-3">
              <div className="grid min-w-0 flex-1 gap-3">{item.conteudo}</div>
              <Button type="button" variant="ghost" size="icon" aria-label={t('remove')} onClick={item.onRemove}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
