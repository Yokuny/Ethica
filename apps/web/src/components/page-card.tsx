import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ethica/ui/components/breadcrumb';
import { Card as SharedCard, CardHeader as SharedCardHeader } from '@ethica/ui/components/card';
import { ItemDescription } from '@ethica/ui/components/item';
import { Link, useLocation, useMatches } from '@tanstack/react-router';
import { cn } from 'cn';
import { HouseIcon, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { TextSizeMenu } from '@/components/user-menu.text-size.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { HOME_SECTIONS } from '@/routes/_private/@consts/home-sections.js';

function routeTitle(staticData: { getTitle?: () => string; title?: string } | undefined) {
  if (typeof staticData?.getTitle === 'function') return staticData.getTitle();
  if (typeof staticData?.title === 'string') return staticData.title;
  return undefined;
}

// Public page: the breadcrumb does not lead to the house (home is a private area).
const PublicPage = React.createContext(false);

// Only the first level gets an icon: the module one, same as the sidebar.
const crumbIcon = (segment: string, index: number): LucideIcon | undefined =>
  index === 0 ? HOME_SECTIONS.find((section) => section.to === `/${segment}`)?.icon : undefined;

function Card({
  className,
  size = 'default',
  asPage,
  children,
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm'; asPage?: boolean | 'public' }) {
  return (
    <SharedCard
      data-slot="card"
      size={size}
      className={cn(
        'border-0 bg-transparent group/card mb-24 flex min-h-dvh flex-col gap-(--card-spacing) rounded-none py-(--card-spacing) pb-24 text-xs/relaxed text-card-foreground [--card-spacing:--spacing(4)] md:pb-(--card-spacing) has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg',
        asPage === true && 'md:min-h-[calc(100dvh-1rem)]',
        className,
      )}
      {...props}
    >
      {asPage === 'public' && (
        <div className="flex justify-end px-(--card-spacing)">
          <TextSizeMenu />
        </div>
      )}
      <PublicPage.Provider value={asPage === 'public'}>{children}</PublicPage.Provider>
    </SharedCard>
  );
}

// Single header line: the breadcrumb is the title (the last item is the current
// page) and the actions (`CardAction`) sit on the right. No back button — the
// way back is the breadcrumb itself.
function CardHeader({
  className,
  title,
  description,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  title?: string;
  description?: string;
}) {
  const location = useLocation();
  const matches = useMatches();
  const isPublic = React.useContext(PublicPage);
  const pathnames = location.pathname.split('/').filter(Boolean);

  const titleOf = (pathname: string, segment: string) =>
    routeTitle(matches.find((m) => m.pathname === pathname || m.pathname === `${pathname}/`)?.staticData) ?? t(segment);
  const resolvedTitle =
    title ??
    routeTitle([...matches].reverse().find((m) => routeTitle(m.staticData))?.staticData) ??
    t(pathnames.at(-1) ?? '');
  const ancestors = pathnames.slice(0, -1);
  const CurrentIcon = crumbIcon(pathnames.at(-1) ?? '', ancestors.length);

  return (
    <SharedCardHeader
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-(--card-spacing)',
        // Below sm the actions move to their own line, left-aligned
        // and wrapping: several buttons do not push the page sideways.
        'max-sm:has-data-[slot=card-action]:grid-cols-1 max-sm:*:data-[slot=card-action]:col-start-1 max-sm:*:data-[slot=card-action]:row-span-1 max-sm:*:data-[slot=card-action]:row-start-auto max-sm:*:data-[slot=card-action]:mt-2 max-sm:*:data-[slot=card-action]:flex-wrap max-sm:*:data-[slot=card-action]:justify-self-start',
        // View filter (toggle) and indicator strip take the full width, below the title.
        '*:data-[slot=toggle-group]:col-span-full *:data-[slot=toggle-group]:mt-2 *:data-[slot=record-stats]:col-span-full *:data-[slot=record-stats]:mt-2',
        className,
      )}
      {...props}
    >
      <Breadcrumb className="col-start-1 flex min-h-8 items-center">
        <BreadcrumbList>
          {/* The first step is the house leading home — except on home itself and on a public page. */}
          {pathnames.length > 0 && !isPublic && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link to="/" aria-label={t('home')}>
                      <HouseIcon aria-hidden />
                    </Link>
                  }
                />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {ancestors.map((segment, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
            const Icon = crumbIcon(segment, index);
            return (
              <React.Fragment key={to}>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={
                      <Link to={to as string}>
                        {Icon && <Icon aria-hidden />}
                        {titleOf(to, segment)}
                      </Link>
                    }
                  />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </React.Fragment>
            );
          })}
          <BreadcrumbItem>
            <BreadcrumbPage>
              {CurrentIcon && <CurrentIcon aria-hidden />}
              {resolvedTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {description && (
        // Screen purpose in one sentence (ENR-01): visible text, never only a tooltip/placeholder.
        <ItemDescription data-slot="card-description" className="line-clamp-none col-start-1">
          {description}
        </ItemDescription>
      )}
      {children}
    </SharedCardHeader>
  );
}

export { CardAction, CardContent, CardFooter, CardTitle } from '@ethica/ui/components/card';
export { Card, CardHeader };
