import type * as React from 'react';
import { cn } from '../lib/utils.js';

// Mesma linguagem visual do Input (input.tsx) — bg-card/hover:border-ring/70/
// ring-2 ring-ring/30 no foco/disabled:bg-muted, nunca um dark: manual (os
// tokens semânticos já trocam de valor por tema, ver apps/web/CLAUDE.md).
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-card shadow-xs px-2.5 py-2 font-sans text-xs transition-colors outline-none placeholder:text-text-secondary hover:border-text-secondary/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
