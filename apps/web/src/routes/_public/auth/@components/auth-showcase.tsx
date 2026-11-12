import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { useEffect, useState } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import { ShowcaseAgenda } from './showcase-agenda.js';
import { ShowcaseCases } from './showcase-cases.js';
import { ShowcaseFinance } from './showcase-finance.js';
import { ShowcaseRoute } from './showcase-route.js';

// APA-10 (AD-220): pieces of the product with made-up data beside the sign-in, one at a time.
// Illustration only: hidden from screen readers and from the keyboard.

const SLIDE_MS = 6000;
const SLIDES = [
  {
    key: 'cases',
    title: t('showcase_cases_title'),
    description: t('showcase_cases_description'),
    Piece: ShowcaseCases,
  },
  {
    key: 'agenda',
    title: t('showcase_agenda_title'),
    description: t('showcase_agenda_description'),
    Piece: ShowcaseAgenda,
  },
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
];

export function AuthShowcase() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((index) => (index + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden inert className="hidden w-full min-w-0 select-none flex-col gap-6 lg:flex">
      <div className="flex gap-2">
        {SLIDES.map(({ key }, index) => (
          <span
            key={key}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-700',
              index === current ? 'bg-foreground' : 'bg-border',
            )}
          />
        ))}
      </div>
      {/* All pieces share one grid cell: the area takes the tallest one and never jumps. */}
      <div className="grid">
        {SLIDES.map(({ key, title, description, Piece }, index) => (
          <div
            key={key}
            className={cn(
              'col-start-1 row-start-1 flex flex-col gap-4 transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none',
              index === current ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
            )}
          >
            <div className="flex flex-col gap-1">
              <ItemTitle className="text-lg">{title}</ItemTitle>
              <ItemDescription className="line-clamp-none">{description}</ItemDescription>
            </div>
            <Piece />
          </div>
        ))}
      </div>
    </div>
  );
}
