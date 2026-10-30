import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ethica/ui/components/dialog';
import { ItemDescription } from '@ethica/ui/components/item';
import { useNavigate } from '@tanstack/react-router';
import { cn } from 'cn';
import { CornerDownLeft, Home, Search } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useMemo, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { HomeSection } from '../@interface/home.interface.js';

type Destination = Pick<HomeSection, 'titleKey' | 'icon'> & { to: '/' | HomeSection['to'] };

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// Atalho global ⌘K / Ctrl+K: abre e fecha a busca de navegação.
export function useCommandMenuShortcut(toggle: () => void) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);
}

// "Ir para…": só navega entre as áreas que a sessão já pode abrir (as mesmas
// da sidebar e da home). Não busca registro — não existe endpoint de busca
// global, e uma caixa que prometesse isso mentiria.
export function CommandMenu({
  open,
  onOpenChange,
  sections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: HomeSection[];
}) {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const destinations = useMemo<Destination[]>(
    () => [{ to: '/', titleKey: 'home', icon: Home }, ...sections],
    [sections],
  );
  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return needle ? destinations.filter((item) => normalize(t(item.titleKey)).includes(needle)) : destinations;
  }, [destinations, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const go = (destination: Destination | undefined) => {
    if (!destination) return;
    onOpenChange(false);
    void navigate({ to: destination.to });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 p-0 sm:max-w-md">
        <DialogTitle className="sr-only">{t('go_to')}</DialogTitle>
        <DialogDescription className="sr-only">{t('go_to_description')}</DialogDescription>
        <div className="flex items-center gap-2 border-b px-3">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label={t('go_to')}
            placeholder={t('go_to_placeholder')}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        <div id={listId} role="listbox" aria-label={t('go_to')} className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <ItemDescription className="line-clamp-none px-2.5 py-6 text-center">{t('no_area_found')}</ItemDescription>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: o teclado opera pelo combobox (setas + Enter); o clique é atalho de mouse.
                <div
                  key={item.to}
                  id={`${listId}-${index}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === active}
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5',
                    index === active && 'bg-accent text-accent-foreground',
                  )}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                >
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <ItemDescription className="text-inherit line-clamp-none flex-1">{t(item.titleKey)}</ItemDescription>
                  {index === active && <CornerDownLeft aria-hidden="true" className="size-3.5 text-muted-foreground" />}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
