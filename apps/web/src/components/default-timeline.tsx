import { BadgeIndicator, type IndicatorVariant } from '@ethica/ui/components/badge';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import type { ComponentProps, ReactNode } from 'react';
import { AppLink } from './app-link.js';

// Linha do tempo vertical para qualquer histórico cronológico (jornada,
// atividades, pedidos). Cada item: ponto colorido pelo resultado, fio até o
// próximo item, data pequena em caixa alta, título (com um prefixo apagado
// opcional), descrição curta e linhas livres embaixo (ações, selos, autor).
export function DefaultTimeline({ className, ...props }: ComponentProps<'ol'>) {
  return <ol className={cn('flex flex-col', className)} {...props} />;
}

// Destino do título quando o evento leva a outro registro.
export type TimelineLink = Pick<ComponentProps<typeof AppLink>, 'to' | 'search'>;

type DefaultTimelineItemProps = Omit<ComponentProps<'li'>, 'title'> & {
  date: ReactNode;
  // ISO do instante, para o `<time datetime>`.
  dateTime?: string;
  // Cor do ponto: os mesmos tons do Badge (success, warning, error, info…).
  variant?: IndicatorVariant;
  // Texto apagado antes do título ("Concluído" Programa beta).
  lead?: ReactNode;
  title: ReactNode;
  // Com `link` o título vira o link padrão do sistema (AppLink).
  link?: TimelineLink;
  description?: ReactNode;
  // Linhas abaixo da descrição: selos, responsável.
  children?: ReactNode;
};

export function DefaultTimelineItem({
  date,
  dateTime,
  variant = 'neutral',
  lead,
  title,
  link,
  description,
  children,
  className,
  ...props
}: DefaultTimelineItemProps) {
  return (
    <li className={cn('group/timeline-item relative ms-8 flex flex-col gap-1 not-last:pb-6', className)} {...props}>
      <span
        aria-hidden
        className="absolute -left-6 top-4.5 h-[calc(100%-1.25rem)] w-0.5 -translate-x-1/2 rounded-full bg-border group-last/timeline-item:hidden"
      />
      <BadgeIndicator variant={variant} className="absolute -left-6 top-1 -translate-x-1/2" />
      <ItemDescription
        render={<time dateTime={dateTime} />}
        className="text-[11px] font-semibold uppercase leading-4 text-muted-foreground/70"
      >
        {date}
      </ItemDescription>
      <div className="min-w-0">
        {lead && (
          <ItemDescription render={<span />} className="inline font-medium">
            {lead}{' '}
          </ItemDescription>
        )}
        {link ? (
          <AppLink {...link}>{title}</AppLink>
        ) : (
          <ItemTitle render={<span />} className="inline font-medium">
            {title}
          </ItemTitle>
        )}
      </div>
      {description && <ItemDescription className="text-xs leading-snug">{description}</ItemDescription>}
      {children && <div className="flex flex-wrap items-center gap-1.5 pt-1">{children}</div>}
    </li>
  );
}
