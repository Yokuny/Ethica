import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/utils.js';

import { Separator } from './separator.js';

// Duas formas de agrupar Items:
// - `grid` (padrão): cada Item é um cartão próprio; quebram em 1/2/3/4 colunas
//   por breakpoint. Sem `flex-1` de propósito: a última linha incompleta
//   mantém a largura da coluna em vez de esticar.
// - `list`: um único cartão com os Items como linhas separadas por fio — a
//   lista densa de registro (arquivos, conversas, pedidos). O grupo desenha
//   as linhas: o filho não leva utilitário de borda.
const itemGroupVariants = cva('group/item-group w-full', {
  variants: {
    variant: {
      grid: 'flex flex-wrap gap-2 [&>*]:min-w-0 [&>*]:basis-full sm:[&>*]:basis-[calc(50%-0.25rem)] xl:[&>*]:basis-[calc(33.333%-0.34rem)] 2xl:[&>*]:basis-[calc(25%-0.375rem)]',
      list: 'flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs [&>*]:rounded-none [&>*]:border-x-0 [&>*]:border-b-0 [&>*]:shadow-none [&>*:first-child]:border-t-0',
    },
  },
  defaultVariants: { variant: 'grid' },
});

function ItemGroup({
  className,
  variant = 'grid',
  ...props
}: React.ComponentProps<'ul'> & VariantProps<typeof itemGroupVariants>) {
  return (
    <ul
      data-slot="item-group"
      data-variant={variant}
      className={cn(itemGroupVariants({ variant }), className)}
      {...props}
    />
  );
}

// Bloco de conteúdo dentro de uma página (painel do inbox, painel de
// agendamento/bloqueio, editor de horários, blocos do kanban). Mesma moldura
// do ItemGroup, mas com padding e sem divisórias — é um contêiner de
// composição livre, não uma lista. Existe pra que nenhuma rota precise
// escrever `<div className="rounded-md border p-4">` à mão.
//
// O Panel cuida só da moldura e da densidade; o arranjo interno (grid, linha,
// alinhamento) continua sendo className do caller — isso é layout local, não
// identidade visual. `render` (mesma API do Item) cobre os casos em que o
// painel é outro elemento, tipicamente um <form>.
function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn('my-2', className)} {...props} />;
}

const itemVariants = cva(
  'group/item flex flex-wrap items-center rounded-lg border bg-card text-xs shadow-xs transition-[background-color,border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 [a]:hover:bg-accent/70 [button]:hover:bg-accent/70',
  {
    variants: {
      variant: {
        default: '',
        // Só o DefaultEmptyData usa: um "vão" esperando conteúdo, então fica
        // num cinza abaixo do canvas em vez de subir pro --card como o
        // conteúdo de verdade.
        muted: 'bg-muted/60',
      },
      size: {
        default: 'gap-2.5 px-3 py-2.5',
        sm: 'gap-2.5 px-3 py-2.5',
        xs: 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Item({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'li'> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: 'li',
    props: mergeProps<'li'>(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props,
    ),
    render,
    state: {
      slot: 'item',
      variant,
      size,
    },
  });
}

const itemMediaVariants = cva(
  'flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        // Ladrilho neutro: ícone é rótulo, não ação, então não leva cor. Quando
        // o Item é um link, o hover acende o ícone na cor de ação.
        icon: "size-8 rounded-md border bg-muted/60 text-muted-foreground transition-colors [a:hover_&]:text-primary [&_svg:not([class*='size-'])]:size-4",
        image:
          'size-10 overflow-hidden rounded-md group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function ItemMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        'flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none',
        className,
      )}
      {...props}
    />
  );
}

// Base tipográfica compartilhada: ItemTitle é um <div> e ItemDescription um <p>.
// O uso ajusta a apresentação com poucas classes locais; `render` troca a tag
// quando a semântica pede (link, label, dt/dd, h2).
function ItemTitle({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex w-fit min-w-0 items-center gap-2 font-sans text-sm font-semibold leading-snug wrap-break-word data-[error=true]:text-destructive',
          className,
        ),
      },
      props,
    ),
    state: { slot: 'item-title' },
  });
}

function ItemDescription({ className, render, ...props }: useRender.ComponentProps<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps<'p'>(
      {
        className: cn(
          'min-w-0 font-sans text-sm font-normal leading-normal text-balance text-muted-foreground wrap-break-word line-clamp-2 data-[error=true]:text-destructive [&>a]:text-impact [&>a]:underline-offset-4 [&>a]:decoration-current/50 [&>a:hover]:underline [&>a:focus-visible]:underline',
          className,
        ),
      },
      props,
    ),
    state: { slot: 'item-description' },
  });
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-actions" className={cn('flex items-center gap-2', className)} {...props} />;
}

function ItemHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-header"
      className={cn('flex basis-full items-center justify-between gap-2', className)}
      {...props}
    />
  );
}

function ItemFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-footer"
      className={cn('flex basis-full items-center justify-between gap-2', className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
};
