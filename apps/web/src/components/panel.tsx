import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { type ReactNode, useId } from 'react';

// Wrapper de bloco sem fundo nem borda: o agrupamento visual fica com quem está
// dentro (Item, Table, form). `size` só regula o espaço entre os filhos.
const panelVariants = cva('flex w-full min-w-0 flex-col', {
  variants: {
    size: {
      default: 'gap-4',
      sm: 'gap-2',
      xs: 'gap-1',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type PanelProps = Omit<useRender.ComponentProps<'section'>, 'title'> &
  VariantProps<typeof panelVariants> & {
    // Cabeçalho opcional: título (com contagem, badge…), descrição e ações à direita.
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
  };

function Panel({ className, size = 'default', render, title, description, actions, children, ...props }: PanelProps) {
  const headingId = useId();
  const hasHeader = Boolean(title || description || actions);
  // Com título, o bloco vira região nomeada por ele (a menos que o chamador já nomeie).
  const labelled = title && !props['aria-label'] && !props['aria-labelledby'] ? { 'aria-labelledby': headingId } : {};
  return useRender({
    defaultTagName: 'section',
    props: mergeProps<'section'>(
      {
        className: cn(panelVariants({ size, className })),
        ...labelled,
        children: (
          <>
            {hasHeader && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {(title || description) && (
                  <div className="grid gap-1">
                    {title && (
                      <ItemTitle className={'uppercase text-xs'} id={headingId} role="heading" aria-level={2}>
                        {title}
                      </ItemTitle>
                    )}
                    {description && <ItemDescription>{description}</ItemDescription>}
                  </div>
                )}
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            )}
            {children}
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: 'panel', size },
  });
}

export { Panel };
