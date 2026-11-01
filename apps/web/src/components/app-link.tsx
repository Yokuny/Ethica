import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link, type LinkProps } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRight } from 'lucide-react';
import type { ComponentProps, MouseEventHandler, ReactNode } from 'react';

type AppLinkProps = LinkProps &
  Pick<ComponentProps<'a'>, 'aria-label' | 'title'> & {
    children?: ReactNode;
    // `title`: highlight text (default); `description`: supporting text.
    as?: 'title' | 'description';
    className?: string;
    // Link inside a clickable row: `(event) => event.stopPropagation()`.
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  };

// System link: a real <Link/> with the typographic base of ItemTitle or
// ItemDescription, dark blue with a dashed underline (`link` class, theme.css)
// and the arrow that signals the click goes to another screen. Every link to a record
// uses this component — do not assemble the combination by hand.
export function AppLink({ as = 'title', className, children, ...link }: AppLinkProps) {
  const Text = as === 'title' ? ItemTitle : ItemDescription;
  return (
    <Text
      render={<Link {...link} />}
      className={cn('link inline-flex w-fit items-center gap-2', as === 'title' && 'font-normal', className)}
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
    </Text>
  );
}
