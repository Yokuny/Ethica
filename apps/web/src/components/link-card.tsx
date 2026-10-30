import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { type ComponentProps, Fragment, type ReactNode } from 'react';

// Grade de destinos: um cartão por destino, duas colunas a partir de `sm`.
export function LinkCardList({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />;
}

type LinkCardProps = Omit<useRender.ComponentProps<'a'>, 'title'> & {
  icon: LucideIcon;
  title: ReactNode;
  // Linha de apoio abaixo do título; valores falsos são ignorados e os demais
  // ficam separados por "/".
  meta?: ReactNode[];
};

// O cartão inteiro é o link: `render={<Link to=… search=…/>}`, sem filhos.
export function LinkCard({ icon: Icon, title, meta = [], render, className, ...props }: LinkCardProps) {
  const details = meta.filter(Boolean);
  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps<'a'>(
      {
        className: cn(
          'group/link-card flex items-center gap-4 rounded-xl border border-border p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/25',
          className,
        ),
        children: (
          <>
            <span
              aria-hidden
              className="flex aspect-square w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all duration-200 [clip-path:inset(0_0_0_0_round_8px)] group-hover/link-card:[clip-path:inset(0_0_3px_0_round_10px)] [&_svg]:size-6"
            >
              <Icon />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <ItemTitle className="text-base">{title}</ItemTitle>
              {details.length > 0 && (
                <ItemDescription>
                  {details.map((part, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa por render
                    <Fragment key={index}>
                      {index > 0 && (
                        <span aria-hidden className="mx-2 text-border">
                          /
                        </span>
                      )}
                      {part}
                    </Fragment>
                  ))}
                </ItemDescription>
              )}
            </div>
            <ArrowUpRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/link-card:-translate-y-0.5 group-hover/link-card:translate-x-0.5"
            />
          </>
        ),
      },
      props,
    ),
  });
}
