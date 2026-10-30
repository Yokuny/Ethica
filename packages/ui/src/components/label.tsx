import type * as React from 'react';
import { cn } from '../lib/utils.js';
import { ItemDescription } from './item.js';

// Rótulos descritivos seguem a caption mono em caixa alta em todo formulário.
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <ItemDescription
      // biome-ignore lint/a11y/noLabelWithoutControl: o conteúdo e o htmlFor chegam pelo ItemDescription/props
      render={<label />}
      data-slot="label"
      className={cn(
        'font-caption font-medium text-[length:var(--caption-size)] uppercase tracking-[0.06em] line-clamp-none text-foreground',
        className,
      )}
      {...(props as React.ComponentProps<typeof ItemDescription>)}
    />
  );
}

export { Label };
