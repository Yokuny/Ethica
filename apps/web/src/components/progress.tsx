import { cn } from 'cn';
import type { ComponentProps } from 'react';

// Native bar with the app identity; a missing value never means zero.
export function Progress({ className, ...props }: ComponentProps<'progress'>) {
  return (
    <progress
      className={cn(
        'h-2 w-full overflow-hidden bg-muted accent-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary',
        className,
      )}
      {...props}
    />
  );
}
