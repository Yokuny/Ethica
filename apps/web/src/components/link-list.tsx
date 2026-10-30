import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

// Lista de destinos (AD-075): todo cartão que leva a outra tela — atalho de
// hub, contador do dia, indicador de relatório, registro relacionado — usa
// esta moldura. Um contorno cinza (frame) envolve o cartão branco (panel), e
// cada destino é uma linha: ladrilho do ícone, valor/título (+ selos), rótulo
// e o botão de seta. A linha inteira é o link; a seta é só sinal visual.
//
// `columns` quebra as linhas em grade a partir de `sm`; os fios de cada linha
// (borda à direita e embaixo) passam 1px da moldura e o `overflow-hidden` do
// cartão corta os da borda externa, inclusive com a última linha incompleta.
const columnsClass: Record<1 | 2 | 3 | 4, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 xl:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
};

type LinkListProps = ComponentProps<'ul'> & { columns?: 1 | 2 | 3 | 4 };

export function LinkList({ columns = 1, className, ...props }: LinkListProps) {
  return (
    <div className="overflow-hidden rounded-[calc(var(--radius-xl)-4px)] border bg-card bg-clip-padding">
      <ul className={cn('-me-px -mb-px grid grid-cols-1', columnsClass[columns], className)} {...props} />
    </div>
  );
}

type LinkListItemProps = Omit<useRender.ComponentProps<'div'>, 'title'> & {
  // Ícone do destino (ladrilho à esquerda).
  icon?: LucideIcon;
  // No lugar do ladrilho, quando o destino tem rosto próprio (avatar).
  media?: ReactNode;
  title: ReactNode;
  // `xl`: o título é um número de destaque (contador, soma, percentual).
  size?: 'default' | 'xl';
  // Selos ao lado do título (status, variação, atraso).
  badges?: ReactNode;
  description?: ReactNode;
  // Linhas extras abaixo do rótulo (regra do indicador, próxima ação, barra).
  children?: ReactNode;
};

// Uma linha. Com `render={<Link …/>}` vira link e ganha a seta; sem `render`
// é uma linha estática (indicador sem lista para abrir, origem indisponível).
// O `<Link>` vai sem filhos: o conteúdo é montado aqui.
export function LinkListItem({
  icon: Icon,
  media,
  title,
  size = 'default',
  badges,
  description,
  children,
  render,
  className,
  ...props
}: LinkListItemProps) {
  const isLink = Boolean(render);
  const content = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        className: cn(
          'group/link-item flex h-full items-center gap-3 px-4 py-3.5 outline-none transition-colors',
          isLink &&
            'hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:ring-inset',
          className,
        ),
        children: (
          <>
            {media}
            {!media && Icon && (
              <span
                aria-hidden
                className="flex size-10.5  items-center justify-center self-center rounded-lg border-3 border-background bg-muted text-accent-foreground transition-colors group-hover/link-item:text-primary dark:border [&_svg]:size-4.5 [&_svg]:opacity-70"
              >
                <Icon />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <ItemTitle className={size === 'xl' ? 'text-xl' : undefined}>{title}</ItemTitle>
                {badges}
              </div>
              {description && <ItemDescription>{description}</ItemDescription>}
              {children}
            </div>
            {isLink && (
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-foreground shadow-xs transition-colors group-hover/link-item:border-primary/40 group-hover/link-item:text-primary [&_svg]:size-4 [&_svg]:opacity-60"
              >
                <ArrowUpRight />
              </span>
            )}
          </>
        ),
      },
      props,
    ),
  });
  return <li className="min-w-0 border-e border-b">{content}</li>;
}
