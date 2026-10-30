import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// Bloco shadcnblocks/product-specs1 sem os dados de exemplo: grupos colapsáveis
// com ícone, título, ação opcional e linhas rótulo/valor (ou corpo livre).

export type ProductSpec = {
  label: ReactNode;
  value: ReactNode;
  // Complemento sob o rótulo (selo, motivo).
  description?: ReactNode;
  // Primeira linha de um registro que ocupa várias linhas: abre uma faixa de
  // separação para não misturar com o registro anterior.
  start?: boolean;
};

export type ProductSpecGroup = {
  id: string;
  name: string;
  icon?: ReactNode;
  actions?: ReactNode;
  specs?: ProductSpec[];
  // Corpo livre no lugar das linhas (formulário, tabela de itens, vazio, erro).
  children?: ReactNode;
  // Abaixo das linhas (paginação).
  footer?: ReactNode;
};

export function ProductSpecs({ groups, className }: { groups: ProductSpecGroup[]; className?: string }) {
  // Guarda os fechados: grupo que aparece depois já nasce aberto.
  const [closedIds, setClosedIds] = useState<string[]>([]);

  const toggle = (id: string) =>
    setClosedIds((prev) => (prev.includes(id) ? prev.filter((closedId) => closedId !== id) : [...prev, id]));
  const expandAll = () => setClosedIds([]);
  const collapseAll = () => setClosedIds(groups.map((group) => group.id));

  return (
    <div className={cn('grid gap-4', className)}>
      <div className="flex justify-end gap-2">
        <ItemDescription render={<button type="button" onClick={expandAll} />} className="hover:text-foreground">
          {t('expand_all')}
        </ItemDescription>
        <ItemDescription>·</ItemDescription>
        <ItemDescription render={<button type="button" onClick={collapseAll} />} className="hover:text-foreground">
          {t('collapse_all')}
        </ItemDescription>
      </div>

      {groups.map((group) => {
        const open = !closedIds.includes(group.id);
        return (
          <Collapsible
            key={group.id}
            open={open}
            onOpenChange={() => toggle(group.id)}
            render={<section aria-label={group.name} className="rounded-lg border" />}
          >
            <div className="flex items-center">
              <CollapsibleTrigger className="flex flex-1 items-center justify-between p-4 text-left hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  {group.icon && (
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted [&_svg]:size-4">
                      {group.icon}
                    </div>
                  )}
                  <ItemTitle>{group.name}</ItemTitle>
                </div>
                <ChevronDown
                  className={cn('size-5 text-muted-foreground transition-transform', open && 'rotate-180')}
                />
              </CollapsibleTrigger>
              {group.actions && <div className="flex shrink-0 items-center gap-2 pr-4">{group.actions}</div>}
            </div>
            <CollapsibleContent>
              <div className="border-t">
                {group.children || (
                  <table className="w-full text-sm">
                    <tbody>
                      {group.specs?.map((spec, index) => (
                        <tr
                          // biome-ignore lint/suspicious/noArrayIndexKey: linhas sem id próprio
                          key={index}
                          className={cn(
                            'border-b last:border-0',
                            spec.start && 'border-t-8 border-t-muted first:border-t-0',
                          )}
                        >
                          <td className="w-1/2 px-4 py-3 align-top">
                            <ItemDescription render={<div />} className="line-clamp-none">
                              {spec.label}
                            </ItemDescription>
                            {spec.description && <div className="mt-1">{spec.description}</div>}
                          </td>
                          <td className="px-4 py-3 align-top font-medium whitespace-pre-wrap">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {group.footer && <div className="border-t px-4 py-2">{group.footer}</div>}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
