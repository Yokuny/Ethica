import { Button } from '@ethica/ui/components/button';
import { ItemTitle } from '@ethica/ui/components/item';
import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// Repeatable record block: one item per row, with remove and add.
export function FieldList({
  title,
  empty,
  actions,
  items,
}: {
  title: string;
  empty: string;
  actions: ReactNode;
  items: Array<{ key: string; conteudo: ReactNode; onRemove: () => void }>;
}) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ItemTitle role="heading" aria-level={2} className="text-xs uppercase">
          {title}
        </ItemTitle>
        {actions}
      </div>
      {!items.length ? (
        <ItemTitle className="font-normal text-muted-foreground">{empty}</ItemTitle>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} className="flex items-start gap-2 py-3">
              <div className="grid min-w-0 flex-1 gap-3">{item.conteudo}</div>
              <Button type="button" variant="ghost" size="icon" aria-label={t('remove')} onClick={item.onRemove}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
