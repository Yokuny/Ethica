import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// shadcnblocks/feature207 block (numbered rows between rules: number, title and text side by side)
// mixed with the expand/collapse of ProductSpecs: "Expandir tudo · Recolher tudo" and one by one (NLA-07).

export type NumberedListItem = {
  id: string;
  // "01", "3.2.1"; empty for an item without a number.
  number?: string;
  title: ReactNode;
  // Text beside the title while the item is closed.
  summary?: ReactNode;
  // 1 to 3: the sub-item steps to the right.
  level?: number;
  // Beside the title (status, pending).
  badge?: ReactNode;
  // Controls of the item, outside the expand button (checkbox, menu).
  actions?: ReactNode;
  // Item left out: shown faded.
  muted?: boolean;
  // Body of the opened item; without it, the row does not open.
  children?: ReactNode;
};

const INDENT = ['', 'md:pl-8', 'md:pl-16'];
const TITLE_SIZE = ['text-xl', 'text-lg', 'text-base'];

export function NumberedList({ items, className }: { items: NumberedListItem[]; className?: string }) {
  // Keeps the opened ones: an item that shows up later starts closed.
  const [openIds, setOpenIds] = useState<string[]>([]);
  const expandable = items.filter((item) => item.children);

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id]));

  return (
    <div className={cn('grid', className)}>
      {expandable.length > 0 && (
        <div className="flex justify-end gap-2 pb-4">
          <ItemDescription
            render={<button type="button" onClick={() => setOpenIds(expandable.map((item) => item.id))} />}
            className="hover:text-foreground"
          >
            {t('expand_all')}
          </ItemDescription>
          <ItemDescription>·</ItemDescription>
          <ItemDescription
            render={<button type="button" onClick={() => setOpenIds([])} />}
            className="hover:text-foreground"
          >
            {t('collapse_all')}
          </ItemDescription>
        </div>
      )}
      <Separator />
      {items.map((item) => {
        const open = Boolean(item.children) && openIds.includes(item.id);
        const level = Math.min(Math.max(item.level ?? 1, 1), 3) - 1;
        const heading = (
          <>
            <ItemDescription className="mt-1 w-12 shrink-0 font-mono tabular-nums">{item.number}</ItemDescription>
            <div className="grid min-w-0 flex-1 items-start gap-2 md:grid-cols-2 md:gap-8">
              <ItemTitle className={cn('line-clamp-none font-normal', TITLE_SIZE[level])}>{item.title}</ItemTitle>
              {!open && item.summary && <ItemDescription className="line-clamp-2">{item.summary}</ItemDescription>}
            </div>
          </>
        );
        return (
          <div key={item.id}>
            <Collapsible
              open={open}
              onOpenChange={() => toggle(item.id)}
              render={<section aria-label={typeof item.title === 'string' ? item.title : undefined} />}
              className={cn('py-6', INDENT[level], item.muted && 'opacity-60')}
            >
              <div className="flex items-start gap-3">
                {item.children ? (
                  <CollapsibleTrigger className="flex min-w-0 flex-1 items-start gap-4 text-left">
                    {heading}
                  </CollapsibleTrigger>
                ) : (
                  <div className="flex min-w-0 flex-1 items-start gap-4">{heading}</div>
                )}
                {item.badge && <div className="mt-1 shrink-0">{item.badge}</div>}
                {item.actions && <div className="flex shrink-0 items-center gap-2">{item.actions}</div>}
                {item.children && (
                  <CollapsibleTrigger aria-label={open ? t('collapse') : t('expand')} className="mt-1 shrink-0">
                    <ChevronDown
                      className={cn('size-5 text-muted-foreground transition-transform', open && 'rotate-180')}
                    />
                  </CollapsibleTrigger>
                )}
              </div>
              {item.children && <CollapsibleContent className="pt-6 md:pl-16">{item.children}</CollapsibleContent>}
            </Collapsible>
            <Separator />
          </div>
        );
      })}
    </div>
  );
}
