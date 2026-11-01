import { useSidebar } from '@ethica/ui/components/sidebar';
import { Link, useLocation } from '@tanstack/react-router';
import { CalendarDays, Gavel, Home, MapPinned, Menu } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';

const tileClassName = cn(
  'flex flex-1 flex-col items-center justify-start gap-1 px-0.5 pt-2.5 text-center leading-tight',
  'font-medium text-[11px] text-muted-foreground transition-colors',
  'data-[status=active]:text-primary',
);

// Mobile navigation: daily-use destinations, open to any tenant
// role, and "Menu", which opens the sidebar (drawer) with the rest. On desktop the
// navigation is the shell sidebar (_private/route.tsx); this dock hides at md:.
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
      <Link to="/expert-cases" className={cn(tileClassName, pathname.startsWith('/expert-cases') && 'text-primary')}>
        <Gavel className="size-5" />
        {t('expert_cases')}
      </Link>
      <Link to="/agenda" className={tileClassName}>
        <CalendarDays className="size-5" />
        {t('agenda')}
      </Link>
      {/* Field (AD-128): the phone screen during the inspection; prospecting stays in the Menu. */}
      <Link to="/field" className={cn(tileClassName, pathname.startsWith('/field') && 'text-primary')}>
        <MapPinned className="size-5" />
        {t('field')}
      </Link>
      <button type="button" onClick={toggleSidebar} className={tileClassName}>
        <Menu className="size-5" />
        {t('menu')}
      </button>
    </nav>
  );
}
