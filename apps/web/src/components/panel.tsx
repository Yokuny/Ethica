import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { type ComponentProps, type ReactNode, useId, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

type PanelProps = Omit<ComponentProps<'section'>, 'title'> & {
  title: ReactNode;
  // Opens with the content, under the header.
  description?: ReactNode;
  // Beside the chevron; they stay usable while the block is closed.
  actions?: ReactNode;
  // Beside the title.
  icon?: ReactNode;
  // Nothing recorded yet (AD-238): dimmed title marked "Não preenchido", and it sinks below the filled blocks of
  // the page (`order-last` in the page's flex column).
  empty?: boolean;
};

// Collapsible block of a record page (AD-172, AD-297): rounded border, icon and title on the left, chevron and
// actions on the right; it starts collapsed. The content stays mounted while closed, so its dialogs (rendered in a
// portal) still open from the header actions. A plain titled block is a `section` written in the page.
export function Panel({ className, title, description, actions, icon, empty = false, children, ...props }: PanelProps) {
  const headingId = useId();
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby={props['aria-label'] ? undefined : headingId}
      className={cn('w-full min-w-0 rounded-lg border', empty && 'order-last', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 text-left hover:bg-muted/50"
        >
          <div className={cn('flex items-center gap-3', empty && 'opacity-60')}>
            {icon && (
              <div className="flex size-8 items-center justify-center rounded-md bg-muted [&_svg]:size-4">{icon}</div>
            )}
            <ItemTitle id={headingId} role="heading" aria-level={2} className={cn(empty && 'font-normal')}>
              {title}
            </ItemTitle>
            {empty && <ItemDescription>{t('not_filled')}</ItemDescription>}
          </div>
          <ChevronDown
            className={cn('size-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
        {/* On a phone the actions take their own row under the title instead of pushing past the screen. */}
        {actions && (
          <div className="flex basis-full flex-wrap items-center gap-2 px-4 pb-4 sm:basis-auto sm:pb-0 sm:pl-0">
            {actions}
          </div>
        )}
      </div>
      <div className={cn('flex flex-col gap-2 border-t p-4', !open && 'hidden')}>
        {description && <ItemDescription>{description}</ItemDescription>}
        {children}
      </div>
    </section>
  );
}
