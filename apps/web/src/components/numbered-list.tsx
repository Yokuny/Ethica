import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// shadcnblocks/feature207 block (numbered rows between rules: number, title and text side by side)
// mixed with the expand/collapse of ProductSpecs: "Expandir tudo · Recolher tudo" and one by one (NLA-07).
// Compact rows, all collapsed at first; a click anywhere on the row opens it, and the subitems only show
// under their opened item, like a table of contents (AD-172).

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
  // Control at the start of the row, before the number (e.g. "Faz parte do laudo").
  leading?: ReactNode;
  // Controls at the end of the row, outside the expand button (arrows, menu).
  actions?: ReactNode;
  // Item left out: shown faded.
  muted?: boolean;
  // Body of the opened item; without it and without subitems, the row does not open.
  children?: ReactNode;
};

const INDENT = ['', 'md:pl-8', 'md:pl-16'];
const TITLE_SIZE = ['text-base', 'text-sm', 'text-sm'];

type NumberedListProps = {
  items: NumberedListItem[];
  // Said once above the list: what the control of each row is (e.g. "Faz parte do laudo").
  actionsLabel?: ReactNode;
  className?: string;
};

export function NumberedList({ items, actionsLabel, className }: NumberedListProps) {
  // Keeps the opened ones: an item that shows up later starts closed.
  const [openIds, setOpenIds] = useState<string[]>([]);
  // An item opens when it has a body or subitems; a subitem only shows with every item above it opened.
  const rows: { item: NumberedListItem; hasSubitems: boolean; visible: boolean }[] = [];
  const parents: NumberedListItem[] = [];
  items.forEach((item, i) => {
    const level = item.level ?? 1;
    while (parents.length && (parents.at(-1)?.level ?? 1) >= level) parents.pop();
    rows.push({
      item,
      hasSubitems: (items[i + 1]?.level ?? 1) > level,
      visible: parents.every((parent) => openIds.includes(parent.id)),
    });
    parents.push(item);
  });
  const expandable = rows.filter((row) => row.item.children || row.hasSubitems).map((row) => row.item);

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id]));

  return (
    <div className={cn('grid', className)}>
      {(expandable.length > 0 || actionsLabel) && (
        <div className="flex flex-wrap items-center justify-end gap-2 pb-3">
          {actionsLabel && <ItemDescription className="mr-auto">{actionsLabel}</ItemDescription>}
          {expandable.length > 0 && (
            <>
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
            </>
          )}
        </div>
      )}
      <Separator />
      {rows.map(({ item, hasSubitems, visible }) => {
        if (!visible) return null;
        const opens = Boolean(item.children) || hasSubitems;
        const open = opens && openIds.includes(item.id);
        const level = Math.min(Math.max(item.level ?? 1, 1), 3) - 1;
        const heading = (
          <>
            <ItemDescription className="w-12 shrink-0 font-mono tabular-nums">{item.number}</ItemDescription>
            <div className="grid min-w-0 flex-1 items-center gap-1 md:grid-cols-2 md:gap-8">
              <ItemTitle className={cn('line-clamp-none font-normal', TITLE_SIZE[level])}>{item.title}</ItemTitle>
              {!open && item.summary && <ItemDescription className="line-clamp-1">{item.summary}</ItemDescription>}
            </div>
          </>
        );
        return (
          <div key={item.id}>
            <Collapsible
              open={open}
              onOpenChange={() => toggle(item.id)}
              render={<section aria-label={typeof item.title === 'string' ? item.title : undefined} />}
              className={cn(INDENT[level], item.muted && 'opacity-60')}
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: the triggers inside keep the keyboard; the row only widens the mouse target */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: same as above */}
              <div
                className={cn('flex items-center gap-3 py-2.5', opens && 'cursor-pointer hover:bg-muted/40')}
                onClick={(event) => {
                  // Controls of the row (checkbox, triggers, links) keep their own click.
                  if (!opens || (event.target as HTMLElement).closest('button, a, input, label')) return;
                  toggle(item.id);
                }}
              >
                {item.leading && <div className="flex shrink-0 items-center">{item.leading}</div>}
                {opens ? (
                  <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-4 text-left">
                    {heading}
                  </CollapsibleTrigger>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-4">{heading}</div>
                )}
                {item.badge && <div className="shrink-0">{item.badge}</div>}
                {item.actions && <div className="flex shrink-0 items-center gap-2">{item.actions}</div>}
                {opens && (
                  <CollapsibleTrigger aria-label={open ? t('collapse') : t('expand')} className="shrink-0">
                    <ChevronDown
                      className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
                    />
                  </CollapsibleTrigger>
                )}
              </div>
              {item.children && <CollapsibleContent className="pt-2 pb-4 md:pl-16">{item.children}</CollapsibleContent>}
            </Collapsible>
            <Separator />
          </div>
        );
      })}
    </div>
  );
}
