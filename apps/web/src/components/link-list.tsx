import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

// Destination list (AD-075): every card that leads to another screen — hub
// shortcut, day counter, report indicator, related record — uses
// this frame. A gray outline (frame) wraps the white card (panel), and
// each destination is a row: icon tile, value/title (+ badges), label
// and the arrow button. The whole row is the link; the arrow is only a visual cue.
//
// `columns` breaks the rows into a grid from `sm` up; each row's lines
// (right and bottom border) go 1px past the frame and the card's `overflow-hidden`
// cuts the outer ones, even with an incomplete last row.
const columnsClass: Record<1 | 2 | 3 | 4, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 xl:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
};

type LinkListProps = ComponentProps<'ul'> & { columns?: 1 | 2 | 3 | 4 };

export function LinkList({ columns = 1, className, ...props }: LinkListProps) {
  return (
    <div className="overflow-hidden rounded-[calc(var(--radius-xl)-4px)] border bg-card bg-clip-padding">
      <ul className={cn('-me-px -mb-px grid grid-cols-1', columnsClass[columns], className)} {...props} />
    </div>
  );
}

type LinkListItemProps = Omit<useRender.ComponentProps<'div'>, 'title'> & {
  // Destination icon (tile on the left).
  icon?: LucideIcon;
  // In place of the tile, when the destination has its own face (avatar).
  media?: ReactNode;
  title: ReactNode;
  // `xl`: the title is a highlight number (counter, sum, percentage).
  size?: 'default' | 'xl';
  // Badges next to the title (status, variation, delay).
  badges?: ReactNode;
  description?: ReactNode;
  // Extra lines below the label (indicator rule, next action, bar).
  children?: ReactNode;
};

// A row. With `render={<Link …/>}` it becomes a link and gets the arrow; without `render`
// it is a static row (indicator without a list to open, unavailable source).
// The `<Link>` goes without children: the content is built here.
export function LinkListItem({
  icon: Icon,
  media,
  title,
  size = 'default',
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
          'group/link-item flex h-full items-center gap-3 px-4 py-3.5 outline-none transition-colors',
          isLink &&
            'hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:ring-inset',
          className,
        ),
        children: (
          <>
            {media}
            {!media && Icon && (
              <span
                aria-hidden
                className="flex size-10.5  items-center justify-center self-center rounded-lg border-3 border-background bg-muted text-accent-foreground transition-colors group-hover/link-item:text-primary dark:border [&_svg]:size-4.5 [&_svg]:opacity-70"
              >
                <Icon />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <ItemTitle className={size === 'xl' ? 'text-xl' : undefined}>{title}</ItemTitle>
                {badges}
              </div>
              {description && <ItemDescription>{description}</ItemDescription>}
              {children}
            </div>
            {isLink && (
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-foreground shadow-xs transition-colors group-hover/link-item:border-primary/40 group-hover/link-item:text-primary [&_svg]:size-4 [&_svg]:opacity-60"
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
  return <li className="min-w-0 border-e border-b">{content}</li>;
}
