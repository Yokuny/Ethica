import { Button } from '@ethica/ui/components/button';
import { Dialog, DialogContent } from '@ethica/ui/components/dialog';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Popover, PopoverContent } from '@ethica/ui/components/popover';
import { useSidebar } from '@ethica/ui/components/sidebar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { preferencesQuery, updatePreferencesMutation } from '@/query/preferences.js';
import { isAdminSession } from '@/query/session.js';
import { TOUR_ACCOUNT, TOUR_OFFICE, TOUR_SECTIONS, TOUR_WELCOME, type TourStep } from '../@consts/tour-steps.js';
import { useHomePage } from '../@hooks/use-home-page.js';

// First visible element of the step: the side menu item on the computer, the dock item on the phone; what only lives
// inside the closed phone menu points to the dock's "Menu". None (welcome step) → the step shows centered.
const findTarget = (target: string): Element | null =>
  [...document.querySelectorAll(`[data-tour="${target}"]`), ...document.querySelectorAll('[data-tour="menu"]')].find(
    (element) => element.getClientRects().length > 0,
  ) ?? null;

// Guided tour of the first access (AD-233): opens while `onboardingDismissed` is false, points to the menu items
// the person can see and records the dismissal when completed or skipped. "Ver tour" in the user menu reopens it.
export function GuidedTour() {
  const queryClient = useQueryClient();
  const { session, sections } = useHomePage();
  const { isMobile } = useSidebar();
  const preferences = useQuery(preferencesQuery);
  const dismissMutation = useMutation({
    ...updatePreferencesMutation(queryClient),
    onError: (error: Error) => toast.error(error.message),
  });
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<Element | null>(null);

  const steps = useMemo<TourStep[]>(
    () => [
      TOUR_WELCOME,
      ...sections
        .filter((section) => TOUR_SECTIONS.includes(section.to))
        .map((section) => ({ target: section.to, titleKey: section.titleKey, descriptionKey: section.descriptionKey })),
      ...(isAdminSession(session) ? [TOUR_OFFICE] : []),
      TOUR_ACCOUNT,
    ],
    [sections, session],
  );
  const open = preferences.data?.onboardingDismissed === false && !dismissMutation.isPending;
  const step = steps[index];
  const target = open ? step?.target : undefined;
  const last = index === steps.length - 1;

  const finish = () => {
    setIndex(0);
    dismissMutation.mutate({ onboardingDismissed: true });
  };

  // Highlights the element of the step before paint, so the balloon never flashes at the previous place.
  useLayoutEffect(() => {
    const element = target ? findTarget(target) : null;
    element?.setAttribute('data-tour-active', '');
    setAnchor(element);
    return () => element?.removeAttribute('data-tour-active');
  }, [target]);

  if (!open || !step) return null;

  const onOpenChange = (nextOpen: boolean, details: { reason: string }) => {
    if (!nextOpen && details.reason === 'escape-key') finish();
  };
  const content = (
    <>
      <div className="flex flex-col gap-1">
        <ItemTitle>{t(step.titleKey)}</ItemTitle>
        <ItemDescription className="line-clamp-none">{t(step.descriptionKey)}</ItemDescription>
      </div>
      <div className="flex items-center gap-2">
        <ItemDescription className="flex-1">{`${index + 1} ${t('of')} ${steps.length}`}</ItemDescription>
        {!last && (
          <Button variant="ghost" onClick={finish}>
            {t('skip')}
          </Button>
        )}
        {index > 0 && (
          <Button variant="outline" onClick={() => setIndex(index - 1)}>
            {t('back')}
          </Button>
        )}
        <Button onClick={last ? finish : () => setIndex(index + 1)}>{t(last ? 'complete' : 'next')}</Button>
      </div>
    </>
  );

  return anchor ? (
    <Popover open onOpenChange={onOpenChange}>
      <PopoverContent anchor={anchor} side={isMobile ? 'top' : 'right'} sideOffset={12} className="w-80 gap-3 p-4">
        {content}
      </PopoverContent>
    </Popover>
  ) : (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-3">
        {content}
      </DialogContent>
    </Dialog>
  );
}
