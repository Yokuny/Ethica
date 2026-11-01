import type * as React from 'react';
import { cn } from '../lib/utils.js';

// Field with an icon/action next to it: the group carries the frame, the child <input> stays bare.
// Inside a table toolbar (`data-table-toolbar`) the group loses border and
// background, like the reference "Search".
function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        'flex h-11 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-card px-2.5 shadow-xs transition-colors has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/20 has-[input:disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-text-secondary in-data-[slot=data-table-toolbar]:h-8 in-data-[slot=data-table-toolbar]:border-0 in-data-[slot=data-table-toolbar]:bg-transparent in-data-[slot=data-table-toolbar]:px-0 in-data-[slot=data-table-toolbar]:shadow-none in-data-[slot=data-table-toolbar]:has-[input:focus-visible]:ring-0',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-input"
      className={cn(
        'h-full min-w-0 flex-1 bg-transparent font-sans text-xs outline-none placeholder:text-text-secondary disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupInput };
