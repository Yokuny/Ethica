import type * as React from 'react';
import { cn } from '../lib/utils.js';

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-sm border bg-card px-1 font-mono text-[10px] font-medium text-text-secondary group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
