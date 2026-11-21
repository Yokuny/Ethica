import type { BillingPlan } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@ethica/ui/components/card';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@ethica/ui/components/carousel';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
import { cn } from 'cn';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PLAN_OPTIONS, type PlanOption, YEARLY_SAVING_CENTS } from '../@consts/plans.js';

type BillingPlansProps = {
  options: PlanOption[];
  paying?: BillingPlan;
  // Without it (member who is not admin) the prices show without the buttons.
  onPay?: (plan: BillingPlan) => void;
};

// "Tudo do Teste, e mais": the included plan by name when its card is on screen; without it (trial
// already used) its features come in the list.
const featuresOf = (option: PlanOption, options: PlanOption[]) => {
  const base = PLAN_OPTIONS.find((other) => other.plan === option.includes);
  if (!base || options.some((other) => other.plan === base.plan)) return { base, features: option.features };
  return { base: undefined, features: [...base.features, ...option.features] };
};

// Plan cards in the Vercel model (price per month, what it adds, the action at the bottom), kept in the
// carousel: all of them side by side on the desktop, one at a time on the phone.
export function BillingPlans({ options, paying, onPay }: BillingPlansProps) {
  const monthlyIndex = options.findIndex((option) => option.plan === 'monthly');
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(monthlyIndex);

  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    api.on('select', update).on('reInit', update);
    return () => {
      api.off('select', update).off('reInit', update);
    };
  }, [api]);

  return (
    <Carousel setApi={setApi} opts={{ align: 'center', containScroll: false, startIndex: monthlyIndex }}>
      <CarouselContent>
        {options.map((option, index) => {
          const centered = selected === index;
          const { base, features } = featuresOf(option, options);
          return (
            <CarouselItem key={option.plan} className="sm:basis-[60%] md:basis-[45%] lg:basis-1/3">
              {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a pointer shortcut; the keyboard moves between plans with the arrows and ←/→ */}
              <div className="h-full" onClick={() => !centered && api?.scrollTo(index)}>
                <Card
                  className={cn(
                    'h-full border shadow-none transition-colors duration-200',
                    centered ? 'border-foreground/40' : 'cursor-pointer border-border/60',
                  )}
                >
                  <CardHeader className="gap-4">
                    <div className="flex items-center justify-between gap-2">
                      <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                        render={<h3 />}
                        className="text-base font-medium"
                      >
                        {option.name}
                      </ItemTitle>
                      {option.plan === 'monthly' && (
                        <Badge variant={centered ? 'default' : 'neutral'}>{t('recommended')}</Badge>
                      )}
                      {option.plan === 'yearly' && (
                        <Badge variant={centered ? 'success' : 'neutral'}>
                          {`${t('billing_save')} ${formatMoney(YEARLY_SAVING_CENTS)}`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-1.5">
                        <ItemTitle className="text-4xl font-semibold tracking-tight">
                          {formatMoney(option.perMonthCents)}
                        </ItemTitle>
                        <ItemDescription>{option.unit}</ItemDescription>
                      </div>
                      <ItemDescription className="line-clamp-none">{option.charge}</ItemDescription>
                    </div>
                    <ItemDescription className="line-clamp-none text-foreground">{option.tagline}</ItemDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <Separator className={cn(!centered && 'opacity-60')} />
                    <ItemDescription className="text-xs uppercase tracking-wide">
                      {base
                        ? `${t('billing_everything_in')} ${base.name}, ${t('billing_and_more')}:`
                        : t('billing_benefits_title')}
                    </ItemDescription>
                    <ul className="space-y-3">
                      {features.map((feature) => (
                        <li key={feature.text} className="flex items-start gap-3">
                          <feature.icon
                            className={cn(
                              'mt-0.5 size-4 shrink-0',
                              centered ? 'text-primary' : 'text-muted-foreground',
                            )}
                            aria-hidden
                          />
                          <ItemDescription className="line-clamp-none text-foreground">{feature.text}</ItemDescription>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  {onPay && (
                    <CardFooter className="flex-col gap-2">
                      <Button
                        className="w-full"
                        size="lg"
                        variant={centered ? 'default' : 'outline'}
                        disabled={Boolean(paying)}
                        onClick={() => onPay(option.plan)}
                      >
                        {option.cta}
                      </Button>
                      {option.plan === 'monthly' && (
                        <Button
                          className="h-auto whitespace-normal"
                          variant="link"
                          size="sm"
                          disabled={Boolean(paying)}
                          onClick={() => onPay('single_month')}
                        >
                          {t('billing_single_month_offer')}
                        </Button>
                      )}
                    </CardFooter>
                  )}
                </Card>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <div className="mt-8 flex justify-center gap-2">
        <CarouselPrevious aria-label={t('previous')} />
        <CarouselNext aria-label={t('next')} />
      </div>
    </Carousel>
  );
}
