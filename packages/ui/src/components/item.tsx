import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/utils.js';

import { Separator } from './separator.js';

// A list of Items: each Item is its own bordered card, stacked at the full width with a gap between them.
// A row is `<Item render={<li />}>`, or `<li><Item render={<Link />} /></li>` when the whole row leads somewhere.
function ItemGroup({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul data-slot="item-group" className={cn('group/item-group flex w-full flex-col gap-2', className)} {...props} />
  );
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn('my-2', className)} {...props} />;
}

const itemVariants = cva(
  'group/item flex flex-wrap items-center rounded-lg border bg-card text-xs transition-[background-color,border-color] duration-150 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 [a]:hover:bg-accent/70 [button]:w-full [button]:text-left [button]:hover:bg-accent/70',
  {
    variants: {
      variant: {
        default: '',
        // Only DefaultEmptyData uses it: a "gap" waiting for content, so it stays
        // a gray below the canvas instead of rising to --card like the
        // real content.
        muted: 'bg-muted/60',
      },
      size: {
        default: 'gap-2.5 px-3 py-2.5',
        sm: 'gap-2.5 px-3 py-2.5',
        xs: 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Item({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'li'> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: 'li',
    props: mergeProps<'li'>(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props,
    ),
    render,
    state: {
      slot: 'item',
      variant,
      size,
    },
  });
}

const itemMediaVariants = cva(
  'flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        // Neutral tile: the icon is a label, not an action, so it carries no color. When
        // the Item is a link, hover lights the icon up in the action color.
        icon: "size-8 rounded-md border bg-muted/60 text-muted-foreground transition-colors [a:hover_&]:text-primary [&_svg:not([class*='size-'])]:size-4",
        image:
          'size-10 overflow-hidden rounded-md group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function ItemMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        'flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none',
        className,
      )}
      {...props}
    />
  );
}

// Shared typographic base: ItemTitle is a <div> and ItemDescription a <p>.
// Usage adjusts the presentation with a few local classes; `render` swaps the tag
// when the semantics ask for it (link, label, dt/dd, h2).
function ItemTitle({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex w-fit min-w-0 items-center gap-2 font-sans text-sm font-semibold leading-snug wrap-break-word data-[error=true]:text-destructive',
          className,
        ),
      },
      props,
    ),
    state: { slot: 'item-title' },
  });
}

function ItemDescription({ className, render, ...props }: useRender.ComponentProps<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps<'p'>(
      {
        className: cn(
          'min-w-0 font-sans text-sm font-normal leading-normal text-balance text-muted-foreground wrap-break-word line-clamp-2 data-[error=true]:text-destructive [&>a]:text-impact [&>a]:underline-offset-4 [&>a]:decoration-current/50 [&>a:hover]:underline [&>a:focus-visible]:underline',
          className,
        ),
      },
      props,
    ),
    state: { slot: 'item-description' },
  });
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-actions" className={cn('flex items-center gap-2', className)} {...props} />;
}

function ItemHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-header"
      className={cn('flex basis-full items-center justify-between gap-2', className)}
      {...props}
    />
  );
}

function ItemFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-footer"
      className={cn('flex basis-full items-center justify-between gap-2', className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
};
