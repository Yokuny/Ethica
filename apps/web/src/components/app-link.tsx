import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link, type LinkProps } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRight } from 'lucide-react';
import type { ComponentProps, MouseEventHandler, ReactNode } from 'react';

type AppLinkProps = LinkProps &
  Pick<ComponentProps<'a'>, 'aria-label' | 'title'> & {
    children?: ReactNode;
    // `title`: texto de destaque (padrão); `description`: texto de apoio.
    as?: 'title' | 'description';
    className?: string;
    // Link dentro de linha clicável: `(event) => event.stopPropagation()`.
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  };

// Link do sistema: <Link/> de verdade com a base tipográfica de ItemTitle ou
// ItemDescription, azul escuro com sublinhado tracejado (classe `link`, theme.css)
// e a seta que avisa que o clique leva a outra tela. Todo link para um registro
// usa este componente — não monte a combinação à mão.
export function AppLink({ as = 'title', className, children, ...link }: AppLinkProps) {
  const Text = as === 'title' ? ItemTitle : ItemDescription;
  return (
    <Text
      render={<Link {...link} />}
      className={cn('link inline-flex w-fit items-center gap-2', as === 'title' && 'font-normal', className)}
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
    </Text>
  );
}
