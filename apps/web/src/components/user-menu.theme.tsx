import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@ethica/ui/components/dropdown-menu';
import { useTheme } from 'next-themes';
import { t } from '@/lib/helpers/translate.helper.js';

// Theme options of the user menu (AD-237). next-themes saves the choice on the device and puts the
// class on html; the phone status bar (theme-color) follows the new background on the next frame.
export function ThemeOptions() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenuRadioGroup
      value={theme}
      onValueChange={(value) => {
        setTheme(value);
        requestAnimationFrame(() => {
          const background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
        });
      }}
    >
      <DropdownMenuRadioItem value="light">{t('light')}</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">{t('dark')}</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="blue">{t('blue')}</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}
