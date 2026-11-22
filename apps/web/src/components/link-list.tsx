import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

// Destination list (AD-075): every row that leads to another screen or record.
// No frame: rows separated by a thin line, always at the full width of the block.
// Each row is icon + title (+ badges), label lines below the title and a quiet arrow;
// on hover an accent background rises from the bottom of the row.
export function LinkList({ className, ...props }: ComponentProps<'ul'>) {
  return <ul className={cn('flex w-full flex-col border-t', className)} {...props} />;
}

type LinkListItemProps = Omit<useRender.ComponentProps<'div'>, 'title'> & {
  icon?: LucideIcon;
  title: ReactNode;
  // Badges next to the title (status, variation, delay).
  badges?: ReactNode;
  description?: ReactNode;
  // Extra lines below the label (installments, next action).
  children?: ReactNode;
};

// A row. With `render={<Link …/>}` (or a `<button>`) it becomes clickable and gets the arrow;
// without `render` it is a static row. The rendered element goes without children: the content is built here.
export function LinkListItem({
  icon: Icon,
  title,
  badges,
  description,
  children,
  render,
  className,
  ...props
}: LinkListItemProps) {
  const isLink = Boolean(render);
  const content = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        className: cn(
          'group/link-item relative flex w-full items-start gap-4 overflow-hidden p-4 text-left outline-none',
          isLink && 'focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:ring-inset',
          className,
        ),
        children: (
          <>
            {isLink && (
              <span
                aria-hidden
                className="absolute inset-0 translate-y-full bg-accent transition-transform duration-300 ease-in-out group-hover/link-item:translate-y-0 group-focus-visible/link-item:translate-y-0 motion-reduce:transition-none"
              />
            )}
            {Icon && (
              <span
                aria-hidden
                className="relative flex h-5 shrink-0 items-center text-muted-foreground [&_svg]:size-4"
              >
                <Icon />
              </span>
            )}
            <div className="relative flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <ItemTitle>{title}</ItemTitle>
                {badges}
              </div>
              {description && <ItemDescription>{description}</ItemDescription>}
              {children}
            </div>
            {isLink && (
              <span
                aria-hidden
                className="relative flex h-5 shrink-0 items-center text-muted-foreground transition-colors group-hover/link-item:text-foreground [&_svg]:size-4"
              >
                <ArrowUpRight />
              </span>
            )}
          </>
        ),
      },
      props,
    ),
  });
  return <li className="min-w-0 border-b">{content}</li>;
}
