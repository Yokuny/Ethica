import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils.js';

// Single selection (tabs/filters): the pressed item gets the Badge pastel tone; the icon already
// carries the tone color when released.
const toggleGroupItemVariants = cva(
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-card px-2.5 shadow-xs font-sans text-xs font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral:
          '[&>svg]:text-status-neutral-indicator data-pressed:bg-status-neutral data-pressed:border-status-neutral-foreground/30 data-pressed:text-status-neutral-foreground',
        success:
          '[&>svg]:text-status-success-indicator data-pressed:bg-status-success data-pressed:border-status-success-foreground/30 data-pressed:text-status-success-foreground',
        warning:
          '[&>svg]:text-status-warning-indicator data-pressed:bg-status-warning data-pressed:border-status-warning-foreground/30 data-pressed:text-status-warning-foreground',
        error:
          '[&>svg]:text-status-error-indicator data-pressed:bg-status-error data-pressed:border-status-error-foreground/30 data-pressed:text-status-error-foreground',
        info: '[&>svg]:text-status-info-indicator data-pressed:bg-status-info data-pressed:border-status-info-foreground/30 data-pressed:text-status-info-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type ToggleTone = NonNullable<VariantProps<typeof toggleGroupItemVariants>['tone']>;

type ToggleGroupProps = Omit<ToggleGroupPrimitive.Props, 'value' | 'defaultValue' | 'onValueChange' | 'multiple'> & {
  value: string;
  onValueChange: (value: string) => void;
};

// Single value API: clicking the item already pressed does not clear the selection.
function ToggleGroup({ value, onValueChange, className, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      value={[value]}
      onValueChange={([next]) => next && onValueChange(next)}
      className={cn('flex w-fit flex-wrap items-center gap-1', className)}
      {...props}
    />
  );
}

type ToggleGroupItemProps = Toggle.Props & VariantProps<typeof toggleGroupItemVariants> & { icon?: LucideIcon };

function ToggleGroupItem({ tone, icon: Icon, className, children, ...props }: ToggleGroupItemProps) {
  return (
    <Toggle className={cn(toggleGroupItemVariants({ tone }), className)} {...props}>
      {Icon && <Icon />}
      {children}
    </Toggle>
  );
}

export { ToggleGroup, ToggleGroupItem };
