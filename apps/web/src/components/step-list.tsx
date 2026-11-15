import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Asterisk } from 'lucide-react';
import type { ReactNode } from 'react';

// Single page in steps (AD-224): the heading stays fixed on the left from `lg` up and the steps,
// numbered by their order, run on the right separated by a rule. Each step brings its own form.
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-6 lg:gap-16">
      <div className="flex h-fit flex-col gap-5 py-8 lg:sticky lg:top-10 lg:col-span-2">
        <div className="relative w-fit pr-8">
          <ItemTitle className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">{title}</ItemTitle>
          <Asterisk aria-hidden className="absolute -top-2 right-0 size-6 text-primary" />
        </div>
        <ItemDescription className="line-clamp-none text-base">{description}</ItemDescription>
      </div>
      <ol className="flex flex-col lg:col-span-4 [counter-reset:step]">{children}</ol>
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
    <li className="relative flex flex-col gap-6 border-t py-8 [counter-increment:step] md:flex-row md:gap-10 lg:py-10">
      <span
        aria-hidden
        className="absolute top-4 right-0 size-4 border-t-3 border-r-3 border-primary [border-top-right-radius:2px]"
      />
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center bg-muted tracking-tighter tabular-nums before:content-[counter(step,decimal-leading-zero)]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-3 pr-8">
          <ItemTitle className="text-2xl font-semibold tracking-tighter lg:text-3xl">{title}</ItemTitle>
          {description && <ItemDescription className="line-clamp-none text-base">{description}</ItemDescription>}
        </div>
        {children}
      </div>
    </li>
  );
}
