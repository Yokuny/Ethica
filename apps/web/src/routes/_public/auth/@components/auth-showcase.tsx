import { Item, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
import { cn } from 'cn';
import { useEffect, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import { ShowcaseAgenda } from './showcase-agenda.js';
import { ShowcaseCases } from './showcase-cases.js';
import { ShowcaseExpenses } from './showcase-expenses.js';
import { ShowcaseFinance } from './showcase-finance.js';
import { ShowcaseRoute } from './showcase-route.js';

// APA-10 (AD-220): pieces of the product with made-up data beside the sign-in, one at a time.
// Illustration only: hidden from screen readers and from the keyboard.

const SLIDE_MS = 6000;
const SLIDES = [
  {
    key: 'route',
    title: t('showcase_route_title'),
    description: t('showcase_route_description'),
    Piece: ShowcaseRoute,
  },
  {
    key: 'finance',
    title: t('showcase_finance_title'),
    description: t('showcase_finance_description'),
    Piece: ShowcaseFinance,
  },
  {
    key: 'agenda',
    title: t('showcase_agenda_title'),
    description: t('showcase_agenda_description'),
    Piece: ShowcaseAgenda,
  },
  {
    key: 'cases',
    title: t('showcase_cases_title'),
    description: t('showcase_cases_description'),
    Piece: ShowcaseCases,
  },
  {
    key: 'expenses',
    title: t('showcase_expenses_title'),
    description: t('showcase_expenses_description'),
    Piece: ShowcaseExpenses,
  },
];

export function AuthShowcase() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((index) => (index + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden inert className="flex w-full min-w-0 select-none flex-col gap-6">
      <div className="flex gap-2">
        {SLIDES.map(({ key }, index) => (
          <span
            key={key}
            className={cn(
              'h-0.5 flex-1 rounded-full transition-colors duration-700',
              index === current ? 'bg-foreground/60' : 'bg-border',
            )}
          />
        ))}
      </div>
      {/* All pieces share one grid cell: the area takes the tallest one and never jumps. */}
      <div className="grid grid-cols-[minmax(0,1fr)]">
        {SLIDES.map(({ key, title, description, Piece }, index) => (
          <div
            key={key}
            className={cn(
              'col-start-1 row-start-1 flex flex-col gap-4 transition-[opacity,translate] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
              index === current ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
            )}
          >
            <div className="flex flex-col items-center gap-1 text-center lg:items-start lg:text-left">
              <ItemTitle className="font-medium text-base">{title}</ItemTitle>
              <ItemDescription className="line-clamp-none">{description}</ItemDescription>
            </div>
            {/* One window for every piece: same height; only the bottom edge fades, where the piece goes on. */}
            <Item className="flex-col flex-nowrap items-stretch gap-0 overflow-hidden p-0 shadow-none">
              <div className="flex gap-1.5 px-3 py-2.5">
                {['close', 'minimize', 'zoom'].map((dot) => (
                  <span key={dot} className="size-2 rounded-full bg-border" />
                ))}
              </div>
              <Separator />
              <div className="h-104 overflow-hidden mask-b-from-85%">
                <Piece />
              </div>
            </Item>
          </div>
        ))}
      </div>
    </div>
  );
}
