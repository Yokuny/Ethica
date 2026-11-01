import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { type ReactNode, useId } from 'react';

// Block wrapper without background or border: visual grouping belongs to what is
// inside (Item, Table, form). `size` only sets the spacing between children.
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
  };

function Panel({ className, size = 'default', render, title, description, actions, children, ...props }: PanelProps) {
  const headingId = useId();
  const hasHeader = Boolean(title || description || actions);
  // With a title, the block becomes a region named by it (unless the caller already names it).
  const labelled = title && !props['aria-label'] && !props['aria-labelledby'] ? { 'aria-labelledby': headingId } : {};
  return useRender({
    defaultTagName: 'section',
    props: mergeProps<'section'>(
      {
        className: cn(panelVariants({ size, className })),
        ...labelled,
        children: (
          <>
            {hasHeader && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {(title || description) && (
                  <div className="grid gap-1">
                    {title && (
                      <ItemTitle className={'uppercase text-xs'} id={headingId} role="heading" aria-level={2}>
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
