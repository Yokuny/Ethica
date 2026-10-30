import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ComponentProps, ReactElement } from 'react';
import { createContext, useContext, useId } from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import { cn } from '../lib/utils.js';
import { ItemDescription } from './item.js';
import { Label } from './label.js';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues extends FieldValues | undefined = undefined,
>({
  ...props
}: ControllerProps<TFieldValues, TName, TTransformedValues>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

function FormItem({ className, ...props }: ComponentProps<'div'>) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return <Label data-slot="form-label" data-error={!!error} className={className} htmlFor={formItemId} {...props} />;
}

// Radix's `Slot` unconditionally clones its single child with merged props
// (no `asChild` toggle — FormControl always behaves like Slot). Base UI has
// no standalone Slot export; `useRender({ render: children, props })` does
// the same `React.cloneElement(render, mergedProps)` merge under the hood
// (verified in `@base-ui/react/internals/useRenderElement.js`), so treating
// `children` as the `render` target reproduces the exact same behavior.
function FormControl({ children, ...props }: ComponentProps<'div'> & { children: ReactElement }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return useRender({
    render: children,
    props: mergeProps<'div'>(
      {
        'data-slot': 'form-control',
        id: formItemId,
        'aria-describedby': !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
        'aria-invalid': !!error,
      } as ComponentProps<'div'>,
      props,
    ),
  });
}

function FormDescription({ className, ...props }: ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return (
    <ItemDescription
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('line-clamp-none', className)}
      {...(props as ComponentProps<typeof ItemDescription>)}
    />
  );
}

function FormMessage({ className, ...props }: ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? '') : props.children;

  if (!body) {
    return null;
  }

  return (
    <ItemDescription
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-destructive line-clamp-none', className)}
      {...(props as ComponentProps<typeof ItemDescription>)}
    >
      {body}
    </ItemDescription>
  );
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
