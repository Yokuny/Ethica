import { Avatar, AvatarFallback } from '@ethica/ui/components/avatar';
import { Badge, type IndicatorVariant } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { InputGroup, InputGroupInput } from '@ethica/ui/components/input-group';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { Separator } from '@ethica/ui/components/separator';
import type { LinkProps } from '@tanstack/react-router';
import { cn } from 'cn';
import { EllipsisVertical, ListFilter, type LucideIcon, Search } from 'lucide-react';
import type * as React from 'react';
import { AppLink } from '@/components/app-link.js';
import { t } from '@/lib/helpers/translate.helper.js';

type DataTableProps = React.ComponentProps<'div'> & {
  // Busca livre: campo sem moldura no topo da tabela, como na referência.
  search?: { value: string; onChange: (value: string) => void };
  // Filtros avançados: ficam num popover aberto por "Filtros"; `active` é a
  // quantidade de filtros aplicados.
  filters?: { content: React.ReactNode; active?: number };
  // Controles extras na mesma linha (ex.: filtros rápidos da fila).
  toolbar?: React.ReactNode;
};

type TableFiltersProps = { content: React.ReactNode; active?: number };

// Botão "Filtros" que abre os controles num popover. Usado pelo `DataTable` e
// por telas sem tabela (kanban, relatórios) para manter o mesmo gesto.
function TableFilters({ content, active }: TableFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" />}>
        <ListFilter />
        {t('filters')}
        {Boolean(active) && <Badge variant="secondary">{active}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3">
        {content}
      </PopoverContent>
    </Popover>
  );
}

// Painel padrão de listagem: uma linha de toolbar (Filtros + busca), fio, e a
// tabela encostada nas bordas. Os `Table*` de `@ethica/ui` e o `TablePagination`
// perdem a própria moldura aqui dentro (`in-data-[slot=data-table]`). Loading
// e estado vazio ganham respiro; a tabela, não.
function DataTable({ search, filters, toolbar, className, children, ...props }: DataTableProps) {
  const hasToolbar = Boolean(search || filters || toolbar);
  return (
    <div data-slot="data-table" className={cn('min-w-0 overflow-hidden', className)} {...props}>
      {hasToolbar && (
        <>
          <div data-slot="data-table-toolbar" className="flex min-w-0 flex-wrap items-center gap-2 px-4 py-2">
            {filters && <TableFilters {...filters} />}
            {search && (
              <InputGroup className="max-w-72 flex-1">
                <Search aria-hidden />
                <InputGroupInput
                  aria-label={t('search')}
                  placeholder={t('search')}
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                />
              </InputGroup>
            )}
            {toolbar}
          </div>
          <Separator />
        </>
      )}
      <div data-slot="data-table-content" className="p-4 has-data-[slot=table-container]:p-0">
        {children}
      </div>
    </div>
  );
}

// ─── Conteúdo da célula ──────────────────────────────────────────────────────
// A partir das linhas-modelo do usuário (`line.html`, `premium line.html`): a
// coluna principal é identidade (avatar ou ícone + título + linha de apoio),
// as demais são valor com uma linha de apoio em 12px, selo de status suave e o
// menu ⋮ no fim. A tela compõe as colunas só com estas peças.

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}` : (words[0]?.slice(0, 2) ?? '');
  return letters.toUpperCase() || '?';
}

type TableIdentityProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  // Pessoa ou empresa: avatar com as iniciais deste nome.
  avatar?: string;
  // Coisa (tarefa, processo, produto): ladrilho cinza com o ícone.
  icon?: LucideIcon;
  // Destino extra (ex.: o cliente do pedido): o título vira `<Link/>` e o clique
  // nele não chega à linha, que abre o próprio registro.
  link?: LinkProps;
  size?: 'default' | 'sm';
};

function TableIdentity({ title, description, avatar, icon: Icon, link, size = 'default' }: TableIdentityProps) {
  return (
    // Largura máxima (a célula libera a quebra, `table.tsx`): o texto longo corta em uma linha com
    // reticências em vez de empurrar as outras colunas; o mínimo mantém o nome
    // legível no celular (a tabela rola de lado).
    <div data-slot="table-identity" className="flex min-w-44 max-w-56 items-center gap-2.5 sm:max-w-72 lg:max-w-96">
      {avatar !== undefined && (
        <Avatar size={size}>
          <AvatarFallback>{initials(avatar)}</AvatarFallback>
        </Avatar>
      )}
      {Icon && (
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
            size === 'sm' ? 'size-6 [&>svg]:size-3.5' : 'size-8 [&>svg]:size-4',
          )}
        >
          <Icon />
        </span>
      )}
      <div className="min-w-0">
        {link ? (
          <AppLink {...link} className="max-w-full" onClick={(event) => event.stopPropagation()}>
            {title}
          </AppLink>
        ) : (
          <ItemTitle className="font-normal line-clamp-1 max-w-full text-left">{title}</ItemTitle>
        )}
        {description && <ItemDescription className="text-xs line-clamp-1">{description}</ItemDescription>}
      </div>
    </div>
  );
}

type TableStackProps = {
  children: React.ReactNode;
  description?: React.ReactNode;
  // `muted`: o valor é secundário (data, código); `error`: atraso, falha.
  tone?: 'default' | 'muted' | 'error';
  descriptionTone?: 'muted' | 'error';
};

// Valor + linha de apoio (data e hora, total e quantidade, etapa e tempo).
function TableStack({ children, description, tone = 'default', descriptionTone = 'muted' }: TableStackProps) {
  return (
    <div data-slot="table-stack">
      <ItemDescription
        className={cn('line-clamp-1', tone === 'default' && 'text-foreground', tone === 'error' && 'text-destructive')}
      >
        {children}
      </ItemDescription>
      {description && (
        <ItemDescription
          className={cn('text-[0.8rem] line-clamp-none', descriptionTone === 'error' && 'text-destructive')}
        >
          {description}
        </ItemDescription>
      )}
    </div>
  );
}

// Ícone + texto discreto (canal, telefone, forma de pagamento).
function TableIconText({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div data-slot="table-icon-text" className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <ItemDescription className="line-clamp-none whitespace-nowrap">{children}</ItemDescription>
    </div>
  );
}

type TableStatusProps = {
  children: React.ReactNode;
  variant?: IndicatorVariant;
  // Cor do status configurável pelo tenant (hex do `StatusOption`).
  color?: string;
};

// Selo suave com bolinha. Status de domínio usam `variant`; status do tenant,
// `color` — o fundo vira a mesma cor a 12%.
function TableStatus({ children, variant = 'neutral', color }: TableStatusProps) {
  const style = color
    ? ({
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      } as React.CSSProperties)
    : undefined;
  return (
    <Badge variant={color ? 'outline' : variant} style={style} className="gap-1.5 px-2 ring-0">
      {children}
    </Badge>
  );
}

const stopRowClick = { onClick: (event: React.MouseEvent) => event.stopPropagation() };

// Menu ⋮ da linha. Não propaga o clique para a linha (que abre o registro);
// cada ação é um `TableRowAction` (com `render={<Link/>}` quando navega).
function TableRowActions({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...stopRowClick} />}
        >
          <EllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40" {...stopRowClick}>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const TableRowAction = (props: React.ComponentProps<typeof DropdownMenuItem>) => <DropdownMenuItem {...props} />;

export {
  DataTable,
  TableFilters,
  TableIconText,
  TableIdentity,
  TableRowAction,
  TableRowActions,
  TableStack,
  TableStatus,
};
