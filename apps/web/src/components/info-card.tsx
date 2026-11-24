import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import type { ComponentProps, ReactNode } from 'react';

// Record cards (AD-225): small registered items of a step or block (device, technical
// responsible, receipt). A gray frame wraps white panels, one per row, each one taking the
// whole width (AD-226).
export function InfoCardList({ className, ...props }: ComponentProps<'ul'>) {
  return <ul className={cn('grid w-full grid-cols-1 gap-1 rounded-2xl bg-muted/70 p-1', className)} {...props} />;
}

export function InfoCard({
  title,
  titleSuffix,
  description,
  badge,
  actions,
}: {
  // Main value (name, amount); `titleSuffix` is its muted tail (the cents).
  title: ReactNode;
  titleSuffix?: ReactNode;
  description?: ReactNode;
  // Bottom left: kind or status of the record.
  badge?: ReactNode;
  // Bottom right: the actions on the record.
  actions?: ReactNode;
}) {
  return (
    <li className="flex w-full min-w-0 flex-col justify-between gap-7 rounded-xl border bg-card bg-clip-padding px-5 py-4">
      <div className="flex flex-col gap-1.5">
        <ItemTitle className="text-xl leading-tight">
          <span>
            {title}
            {titleSuffix && <span className="text-muted-foreground/40">{titleSuffix}</span>}
          </span>
        </ItemTitle>
        {description && <ItemDescription className="text-xs leading-relaxed">{description}</ItemDescription>}
      </div>
      {(badge || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {badge}
          {actions && <div className="ms-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
    </li>
  );
}
