import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { Type } from 'lucide-react';
import { type TextSize, useTextSize } from '@/hooks/useTextSize.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Opções de tamanho do texto, reaproveitadas pelo menu do usuário e pelo menu público.
export function TextSizeOptions() {
  const { textSize, setTextSize } = useTextSize();
  return (
    <DropdownMenuRadioGroup value={textSize} onValueChange={(value) => setTextSize(value as TextSize)}>
      <DropdownMenuRadioItem value="sm">{t('small')}</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="md">{t('medium')}</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="lg">{t('large')}</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

// Menu avulso das páginas públicas (sem sidebar).
export function TextSizeMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={t('text_size')} />}>
        <Type />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <TextSizeOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
