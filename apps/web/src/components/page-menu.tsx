import { Button } from '@ethica/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@ethica/ui/components/dropdown-menu';
import { Ellipsis } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// Page header "…" menu: secondary actions as `DropdownMenuItem`.
export function PageMenu({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t('more_actions')} />}>
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
