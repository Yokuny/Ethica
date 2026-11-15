import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

// Block wrapper without background or border: visual grouping belongs to what is
// inside (Item, Table, form). `size` only sets the spacing between children; a collapsible block is boxed.
const panelVariants = cva('flex w-full min-w-0 flex-col', {
  variants: {
    size: {
      default: 'gap-4',
      sm: 'gap-2',
      xs: 'gap-1',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type PanelProps = Omit<useRender.ComponentProps<'section'>, 'title'> &
  VariantProps<typeof panelVariants> & {
    // Optional header: title (with count, badge…), description and actions on the right.
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    // The title opens and closes the content, which starts collapsed (AD-172), inside a rounded box. The
    // content stays mounted while closed, so its dialogs (rendered in a portal) still open from the header actions.
    collapsible?: boolean;
    // Beside the title of a collapsible block.
    icon?: ReactNode;
  };

function Panel({
  className,
  size = 'default',
  render,
  title,
  description,
  actions,
  collapsible = false,
  icon,
  children,
  ...props
}: PanelProps) {
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const hasHeader = Boolean(title || description || actions);
  // With a title, the block becomes a region named by it (unless the caller already names it).
  const labelled = title && !props['aria-label'] && !props['aria-labelledby'] ? { 'aria-labelledby': headingId } : {};
  return useRender({
    defaultTagName: 'section',
    props: mergeProps<'section'>(
      {
        className: collapsible
          ? cn('w-full min-w-0 rounded-lg border', className)
          : cn(panelVariants({ size, className })),
        ...labelled,
        children: collapsible ? (
          // Same box as the ProductSpecs groups (Juízo, Partes): rounded border, icon and title on the left,
          // chevron and actions on the right; the description opens with the content.
          <>
            <div className="flex items-center">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {icon && (
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted [&_svg]:size-4">
                      {icon}
                    </div>
                  )}
                  <ItemTitle id={headingId} role="heading" aria-level={2}>
                    {title}
                  </ItemTitle>
                </div>
                <ChevronDown
                  className={cn('size-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                />
              </button>
              {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 pr-4">{actions}</div>}
            </div>
            <div className={cn(panelVariants({ size }), 'border-t p-4', !open && 'hidden')}>
              {description && <ItemDescription>{description}</ItemDescription>}
              {children}
            </div>
          </>
        ) : (
          <>
            {hasHeader && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {(title || description) && (
                  <div className="grid gap-1">
                    {title && (
                      <ItemTitle className="uppercase text-xs" id={headingId} role="heading" aria-level={2}>
                        {title}
                      </ItemTitle>
                    )}
                    {description && <ItemDescription>{description}</ItemDescription>}
                  </div>
                )}
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            )}
            {children}
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: 'panel', size },
  });
}

export { Panel };
