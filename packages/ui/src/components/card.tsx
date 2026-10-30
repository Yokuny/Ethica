import type * as React from 'react';
import { cn } from '../lib/utils.js';

function Card({ className, size = 'default', ...props }: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-(--card-spacing) rounded-lg border bg-card py-(--card-spacing) text-card-foreground [--card-spacing:--spacing(4)] data-[size=sm]:[--card-spacing:--spacing(3)]',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('font-sans text-sm font-medium group-data-[size=sm]/card:text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

// Empilhar com `gap-6` é o que praticamente toda página quer — era isso que
// cada rota repetia como `className="flex flex-col gap-4"`. Vira o default;
// quem precisa de outro layout (ex.: inbox, grid de 2 colunas) sobrescreve
// via className, que aí é layout local e não identidade visual.
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('flex flex-col gap-6 px-(--card-spacing)', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center p-(--card-spacing)', className)} {...props} />;
}

export { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle };
