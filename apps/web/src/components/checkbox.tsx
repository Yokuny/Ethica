import type { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Checkbox as SharedCheckbox } from '@ethica/ui/components/checkbox';
import { Label } from '@ethica/ui/components/label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { type ReactNode, useId } from 'react';

const checkboxWrapperVariants = cva('flex', {
  variants: {
    orientation: {
      horizontal: 'flex-row items-center gap-2',
      vertical: 'flex-col items-center gap-1 whitespace-nowrap',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

type CheckboxProps = CheckboxPrimitive.Root.Props & {
  label?: ReactNode;
  labelClassName?: string;
  orientation?: VariantProps<typeof checkboxWrapperVariants>['orientation'];
};

function Checkbox({ className, label, labelClassName, orientation, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  const checkbox = <SharedCheckbox id={checkboxId} className={className} {...props} />;

  if (!label) return checkbox;

  return (
    <div className={cn(checkboxWrapperVariants({ orientation }))}>
      {checkbox}
      <Label htmlFor={checkboxId} className={cn('cursor-pointer', labelClassName)}>
        {label}
      </Label>
    </div>
  );
}

export { Checkbox };
