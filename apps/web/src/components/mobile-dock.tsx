import { useSidebar } from '@ethica/ui/components/sidebar';
import { Link, useLocation } from '@tanstack/react-router';
import { CalendarDays, Gavel, Home, Menu, Radar } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';

const tileClassName = cn(
  'flex flex-1 flex-col items-center justify-start gap-1 px-0.5 pt-2.5 text-center leading-tight',
  'font-medium text-[11px] text-muted-foreground transition-colors',
  'data-[status=active]:text-primary',
);

// Navegação mobile: destinos de uso diário, liberados a qualquer papel do
// tenant, e "Menu", que abre a sidebar (drawer) com o resto. No desktop a
// navegação é a sidebar do shell (_private/route.tsx); esta dock some em md:.
export function MobileDock() {
  const { toggleSidebar } = useSidebar();
  const pathname = useLocation().pathname;
  return (
    <nav
      aria-label={t('main_navigation')}
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch justify-around border-t bg-card/95 pb-[env(safe-area-inset-bottom)] supports-backdrop-filter:bg-card/85 supports-backdrop-filter:backdrop-blur-md md:hidden"
    >
      <Link to="/" activeOptions={{ exact: true }} className={tileClassName}>
        <Home className="size-5" />
        {t('home')}
      </Link>
      <Link to="/pericias" className={cn(tileClassName, pathname.startsWith('/pericias') && 'text-primary')}>
        <Gavel className="size-5" />
        {t('expert_cases')}
      </Link>
      <Link to="/agenda" className={tileClassName}>
        <CalendarDays className="size-5" />
        {t('agenda')}
      </Link>
      <Link to="/prospeccao" className={cn(tileClassName, pathname.startsWith('/prospeccao') && 'text-primary')}>
        <Radar className="size-5" />
        {t('prospecting')}
      </Link>
      <button type="button" onClick={toggleSidebar} className={tileClassName}>
        <Menu className="size-5" />
        {t('menu')}
      </button>
    </nav>
  );
}
