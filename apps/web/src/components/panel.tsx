import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import {
  Children,
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// Last "Expandir tudo"/"Recolher tudo" click of the group; `count` tells a new click from the first render.
const ExpandAllContext = createContext({ open: false, count: 0 });

// The collapsible blocks of a page stacked in one frame (AD-312), with "Expandir tudo · Recolher tudo" above it
// when there is more than one block.
export function PanelGroup({ className, children, ...props }: ComponentProps<'div'>) {
  const [expandAll, setExpandAll] = useState({ open: false, count: 0 });
  const toggleAll = (open: boolean) => setExpandAll((prev) => ({ open, count: prev.count + 1 }));
  return (
    <div className="grid w-full min-w-0 gap-2">
      {Children.toArray(children).length > 1 && (
        <div className="flex justify-end gap-2">
          <ItemDescription
            render={<button type="button" onClick={() => toggleAll(true)} />}
            className="hover:text-foreground"
          >
            {t('expand_all')}
          </ItemDescription>
          <ItemDescription>·</ItemDescription>
          <ItemDescription
            render={<button type="button" onClick={() => toggleAll(false)} />}
            className="hover:text-foreground"
          >
            {t('collapse_all')}
          </ItemDescription>
        </div>
      )}
      <ExpandAllContext.Provider value={expandAll}>
        <div className={cn('flex flex-col overflow-hidden rounded-lg border', className)} {...props}>
          {children}
        </div>
      </ExpandAllContext.Provider>
    </div>
  );
}

type PanelProps = Omit<ComponentProps<'section'>, 'title'> & {
  title: ReactNode;
  // Opens with the content, under the header.
  description?: ReactNode;
  // Beside the chevron; they stay usable while the block is closed.
  actions?: ReactNode;
  // Beside the title.
  icon?: ReactNode;
  // Nothing recorded yet (AD-238): dimmed title marked "Não preenchido", and it sinks below the filled blocks of
  // the group (`order-last`).
  empty?: boolean;
};

// Collapsible block of a record page (AD-172, AD-297, AD-312), always inside a `PanelGroup`: thin tinted header
// with icon and title on the left, chevron and actions on the right; it starts collapsed. The divider is the
// block's own top border pulled 1px up, so the first block, whatever the order, hides it under the frame. The
// content stays mounted while closed, so its dialogs (rendered in a portal) still open from the header actions.
export function Panel({ className, title, description, actions, icon, empty = false, children, ...props }: PanelProps) {
  const headingId = useId();
  const expandAll = useContext(ExpandAllContext);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (expandAll.count) setOpen(expandAll.open);
  }, [expandAll]);
  return (
    <section
      aria-labelledby={props['aria-label'] ? undefined : headingId}
      className={cn('-mt-px w-full min-w-0 border-t', empty && 'order-last', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center bg-muted">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent"
        >
          <div className={cn('flex items-center gap-3', empty && 'opacity-60')}>
            {icon && <span className="flex text-impact [&_svg]:size-4">{icon}</span>}
            <ItemTitle id={headingId} role="heading" aria-level={2} className={cn(empty && 'font-normal')}>
              {title}
            </ItemTitle>
            {empty && <ItemDescription>{t('not_filled')}</ItemDescription>}
          </div>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
        {/* On a phone the actions take their own row under the title instead of pushing past the screen. */}
        {actions && (
          <div className="flex basis-full flex-wrap items-center gap-2 px-4 pb-2 sm:basis-auto sm:pb-0 sm:pl-0">
            {actions}
          </div>
        )}
      </div>
      <div hidden={!open} className="flex flex-col gap-2 border-t p-4">
        {description && <ItemDescription>{description}</ItemDescription>}
        {children}
      </div>
    </section>
  );
}
