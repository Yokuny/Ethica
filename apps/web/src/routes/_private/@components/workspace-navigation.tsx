import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Kbd } from '@ethica/ui/components/kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@ethica/ui/components/sidebar';
import { Link, useLocation } from '@tanstack/react-router';
import { Home, Scale, Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { UserMenu } from '@/components/user-menu.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useHomePage } from '../@hooks/use-home-page.js';
import type { HomeSection } from '../@interface/home.interface.js';
import { CommandMenu, useCommandMenuShortcut } from './command-menu.js';

const groups: { key: string; destinations: HomeSection['to'][]; heading: string }[] = [
  { key: 'work', destinations: ['/pericias', '/laudos', '/partes', '/agenda', '/prospeccao'], heading: 'work' },
  { key: 'management', destinations: ['/financeiro', '/relatorios'], heading: 'management' },
  { key: 'admin', destinations: ['/users', '/office'], heading: 'settings' },
];

function NavigationLink({ to, titleKey, icon: Icon }: Pick<HomeSection, 'to' | 'titleKey' | 'icon'>) {
  const pathname = useLocation().pathname;
  const sectionPath = `/${to.split('/')[1]}`;
  const label = t(titleKey);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link to={to} activeOptions={{ exact: false }} />}
        isActive={pathname === sectionPath || pathname.startsWith(`${sectionPath}/`)}
        tooltip={label}
      >
        <Icon aria-hidden="true" />
        <ItemDescription className="text-inherit line-clamp-none">{label}</ItemDescription>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function WorkspaceNavigation() {
  const pathname = useLocation().pathname;
  const { isMobile, state } = useSidebar();
  const { session, sections } = useHomePage();
  const [searchOpen, setSearchOpen] = useState(false);
  const toggleSearch = useCallback(() => setSearchOpen((open) => !open), []);
  useCommandMenuShortcut(toggleSearch);

  return (
    <>
      <Sidebar
        variant="inset"
        collapsible="icon"
        mobileTitle={t('main_navigation')}
        mobileDescription={session.tenant?.name ?? t('workspace')}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-1">
              <SidebarMenuButton
                size="lg"
                render={<Link to="/" activeOptions={{ exact: true }} />}
                tooltip="Ethica"
                className="group-data-[collapsible=icon]:hidden"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Scale aria-hidden="true" className="size-4.5" strokeWidth={2.25} />
                </div>
                <span className="min-w-0">
                  <ItemTitle className="line-clamp-1 block">{session.tenant?.name ?? t('workspace')}</ItemTitle>
                </span>
              </SidebarMenuButton>
              <SidebarTrigger label={t('toggle_sidebar')} />
            </SidebarMenuItem>
            <SidebarMenuItem className="mt-1">
              <SidebarMenuButton
                variant={isMobile || state === 'expanded' ? 'outline' : 'default'}
                tooltip={t('go_to')}
                onClick={() => setSearchOpen(true)}
              >
                <Search aria-hidden="true" />
                <ItemDescription className="text-inherit line-clamp-none flex-1">{t('go_to')}</ItemDescription>
                <Kbd>⌘K</Kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t('overview')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to="/" activeOptions={{ exact: true }} />}
                    isActive={pathname === '/'}
                    tooltip={t('home')}
                  >
                    <Home aria-hidden="true" />
                    <ItemDescription className="text-inherit line-clamp-none">{t('home')}</ItemDescription>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {groups.map(({ key, destinations, heading }) => {
            const items = sections.filter((section) => destinations.includes(section.to));
            if (!items.length) return null;
            return (
              <SidebarGroup key={key}>
                <SidebarGroupLabel>{t(heading)}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((section) => (
                      <NavigationLink key={section.to} {...section} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        <SidebarFooter>
          <UserMenu name={session.user.name} avatar={session.user.avatar} />
        </SidebarFooter>
      </Sidebar>
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} sections={sections} />
    </>
  );
}
