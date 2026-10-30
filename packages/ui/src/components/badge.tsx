import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils.js';

// Selo de status: fundo 50, texto 900 e anel interno por tom (paleta Tailwind).
const tone = {
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-600/30',
  warning: 'bg-yellow-50 text-yellow-900 ring-yellow-600/30',
  error: 'bg-red-50 text-red-900 ring-red-600/20',
  info: 'bg-blue-50 text-blue-900 ring-blue-500/30',
  neutral: 'bg-gray-50 text-gray-900 ring-gray-500/30',
  orange: 'bg-orange-50 text-orange-900 ring-orange-500/30',
  cyan: 'bg-cyan-50 text-cyan-900 ring-cyan-500/30',
  violet: 'bg-violet-50 text-violet-900 ring-violet-500/30',
} as const;

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm px-2 py-1 font-sans text-xs font-medium whitespace-nowrap ring-1 ring-inset [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: tone.info,
        secondary: tone.neutral,
        outline: 'bg-transparent text-foreground ring-border',
        muted: 'bg-transparent text-muted-foreground ring-transparent',
        success: tone.success,
        warning: tone.warning,
        error: tone.error,
        info: tone.info,
        neutral: tone.neutral,
        orange: tone.orange,
        cyan: tone.cyan,
        violet: tone.violet,
        // Estados do domínio mapeados para os cinco tons.
        active: tone.success,
        pending: tone.warning,
        waiting: tone.info,
        confirmed: tone.success,
        completed: tone.success,
        in_progress: tone.info,
        no_show: tone.error,
        canceled: tone.neutral,
        canceled_by_patient: tone.warning,
        canceled_by_professional: tone.warning,
        partial: tone.warning,
        paid: tone.success,
        refund: tone.info,
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

function Badge({
  className,
  variant,
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, props),
    state: { slot: 'badge' },
  });
}

// Bolinha de status. Os estados do domínio usam o mesmo mapa de tons do Badge.
const dotTone: Record<keyof typeof tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-500',
  orange: 'bg-orange-500',
  cyan: 'bg-cyan-500',
  violet: 'bg-violet-500',
};

const variantTone: Partial<Record<BadgeVariant, keyof typeof tone>> = {
  success: 'success',
  active: 'success',
  confirmed: 'success',
  completed: 'success',
  paid: 'success',
  warning: 'warning',
  pending: 'warning',
  canceled_by_patient: 'warning',
  canceled_by_professional: 'warning',
  partial: 'warning',
  error: 'error',
  no_show: 'error',
  info: 'info',
  orange: 'orange',
  cyan: 'cyan',
  violet: 'violet',
  waiting: 'info',
  in_progress: 'info',
  refund: 'info',
};

type BadgeIndicatorProps = useRender.ComponentProps<'span'> & {
  variant?: BadgeVariant;
  // Cor crua (hex/CSS) de status configurável por tenant; vence `variant`.
  color?: string;
  pulse?: boolean;
  children?: ReactNode;
};

function Dot({
  variant,
  color,
  pulse,
  className,
}: Pick<BadgeIndicatorProps, 'variant' | 'color' | 'pulse' | 'className'>) {
  const colorClass = color ? undefined : dotTone[variantTone[variant ?? 'pending'] ?? 'neutral'];
  const style = color ? { backgroundColor: color } : undefined;
  return (
    <span className={cn('relative flex size-2', className)}>
      {pulse && (
        <span
          className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', colorClass)}
          style={style}
        />
      )}
      <span className={cn('relative inline-flex size-2 rounded-full', colorClass)} style={style} />
    </span>
  );
}

function BadgeIndicator({ className, variant, color, pulse = false, render, children, ...props }: BadgeIndicatorProps) {
  const hasChildren = Boolean(children);
  // useRender é hook: roda sempre; `enabled` decide se há wrapper.
  const rendered = useRender({
    enabled: hasChildren,
    defaultTagName: 'span',
    render,
    props: mergeProps<'span'>(
      {
        className: cn(
          'inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap font-sans text-xs font-medium',
          className,
        ),
        children: (
          <>
            <Dot variant={variant} color={color} pulse={pulse} />
            {children}
          </>
        ),
      },
      props,
    ),
    state: { slot: 'badge-indicator' },
  });
  return hasChildren ? rendered : <Dot variant={variant} color={color} pulse={pulse} className={className} />;
}

export type IndicatorVariant = BadgeVariant;
export { Badge, BadgeIndicator, badgeVariants };
