import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Asterisk } from 'lucide-react';
import type { ReactNode } from 'react';

// Single page in steps (AD-224), from the shadcnblocks "process1" layout: the heading stays fixed on
// the left from `lg` up and the steps, numbered by their order, run on the right separated by a rule.
// Each step brings its own form. The orange asterisk and the red corners are the block's own colors.
export function StepList({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-6 lg:gap-20">
      <div className="col-span-2 flex h-fit flex-col gap-7 py-8 lg:sticky lg:top-10">
        <div className="relative w-fit">
          <ItemTitle className="block text-5xl leading-none font-semibold tracking-tight text-foreground lg:text-7xl">
            {title}
          </ItemTitle>
          <Asterisk aria-hidden className="absolute -top-2 -right-2 size-5 text-orange-500 md:size-10 lg:-right-14" />
        </div>
        <ItemDescription className="line-clamp-none text-base text-foreground/50">{description}</ItemDescription>
      </div>
      <ol className="relative col-span-4 w-full [counter-reset:step] lg:pl-22">{children}</ol>
    </div>
  );
}

export function StepItem({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="relative flex flex-col gap-10 border-t py-8 [counter-increment:step] md:flex-row lg:py-10">
      <StepCorner />
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center bg-muted px-4 py-1 text-base tracking-tighter text-foreground before:content-[counter(step,decimal-leading-zero)]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4 pr-8">
          <ItemTitle className="block text-2xl leading-tight font-semibold tracking-tighter text-foreground lg:text-3xl">
            {title}
          </ItemTitle>
          {description && (
            <ItemDescription className="line-clamp-none text-base text-foreground/50">{description}</ItemDescription>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

function StepCorner() {
  return (
    <svg aria-hidden width="22" height="20" viewBox="0 0 22 20" fill="none" className="absolute top-4 right-0">
      <line x1="0.607422" y1="2.57422" x2="21.5762" y2="2.57422" stroke="#FF0000" strokeWidth="4" />
      <line x1="19.5762" y1="19.624" x2="19.5762" y2="4.57422" stroke="#FF0000" strokeWidth="4" />
    </svg>
  );
}
