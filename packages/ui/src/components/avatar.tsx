'use client';

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

// Round avatar by default (the only `rounded-full` shape besides the status
// dot); `shape="square"` is the highlight card portrait, with a
// `rounded-2xl` corner. Without a photo, the fallback shows initials in the blue ink with the ink
// dark blue — always the pair (apps/web/DESIGN.md, Secondary).
const avatarVariants = cva('relative inline-flex shrink-0 select-none overflow-hidden', {
  variants: {
    size: {
      sm: 'size-6 text-[calc(var(--text-xs)*0.85)]',
      default: 'size-8 text-xs',
      lg: 'size-12 text-sm',
      xl: 'size-32 text-4xl sm:size-40',
    },
    shape: {
      round: 'rounded-full',
      square: 'rounded-2xl',
    },
  },
  defaultVariants: { size: 'default', shape: 'round' },
});

function Avatar({
  className,
  size,
  shape,
  ...props
}: AvatarPrimitive.Root.Props & VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size, shape }), className)} {...props} />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className={cn('size-full object-cover', className)} {...props} />
  );
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center bg-secondary font-medium text-secondary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
