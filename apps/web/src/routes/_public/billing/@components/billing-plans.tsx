import { BILLING_PLAN_CENTS, type BillingPlan } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Card, CardContent, CardHeader } from '@ethica/ui/components/card';
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
import { BadgeCheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PLAN_OPTIONS, type PlanOption } from '../@consts/plans.js';

type BillingPlansProps = {
  options: PlanOption[];
  paying?: BillingPlan;
  // Without it (member who is not admin) the prices show without the "Pagar" buttons.
  onPay?: (plan: BillingPlan) => void;
};

// "Tudo do Teste, e mais": the included plan by name when its card is on screen; without it (trial
// already used) its features come in the list.
const featuresOf = (option: PlanOption, options: PlanOption[]) => {
  const base = PLAN_OPTIONS.find((other) => other.plan === option.includes);
  if (!base || options.some((other) => other.plan === base.plan)) return { base, features: option.features };
  return { base: undefined, features: [...base.features, ...option.features] };
};

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
          const priceCents = BILLING_PLAN_CENTS[option.plan];
          const MethodIcon = option.methodIcon;
          const { base, features } = featuresOf(option, options);
          return (
            <CarouselItem key={option.plan} className="sm:basis-[60%] md:basis-[45%] lg:basis-[34%]">
              {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a pointer shortcut; the keyboard moves between plans with the arrows and ←/→ */}
              <div className="h-full" onClick={() => !centered && api?.scrollTo(index)}>
                <Card
                  className={cn(
                    'h-full border shadow-none transition-colors duration-200',
                    centered ? 'border-foreground/40' : 'cursor-pointer border-border/60',
                  )}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                        render={<h3 />}
                        className="text-base font-medium"
                      >
                        {option.name}
                      </ItemTitle>
                      {option.plan === 'monthly' ? (
                        <Badge variant={centered ? 'default' : 'neutral'}>{t('recommended')}</Badge>
                      ) : (
                        option.referenceCents && (
                          <Badge variant={centered ? 'success' : 'neutral'}>
                            {`${t('billing_save')} ${formatMoney(option.referenceCents - priceCents)}`}
                          </Badge>
                        )
                      )}
                    </div>
                    <ItemDescription className="line-clamp-none">{option.tagline}</ItemDescription>
                    <div className="mt-4">
                      {/* The struck line keeps its height on every card, so the prices line up. */}
                      <ItemDescription className={cn('line-through', !option.referenceCents && 'invisible')}>
                        {option.referenceCents ? formatMoney(option.referenceCents) : ' '}
                      </ItemDescription>
                      <ItemTitle className="text-4xl font-semibold">{formatMoney(priceCents)}</ItemTitle>
                      <ItemDescription>
                        {option.plan === 'yearly'
                          ? `${option.period} · ${t('billing_equals_to')} ${formatMoney(option.perMonthCents)} ${t('per_month').toLowerCase()}`
                          : option.period}
                      </ItemDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    <div
                      className={cn(
                        'flex items-start gap-3 rounded-md border p-3 transition-colors',
                        centered ? 'border-border bg-muted/50' : 'border-border/60',
                      )}
                    >
                      <MethodIcon
                        className={cn('mt-0.5 size-4 shrink-0', centered ? 'text-foreground' : 'text-muted-foreground')}
                        aria-hidden
                      />
                      <div className="flex flex-col gap-1">
                        <ItemTitle>{option.method}</ItemTitle>
                        <ItemDescription className="line-clamp-none">{option.advantage}</ItemDescription>
                      </div>
                    </div>
                    {onPay && (
                      <Button
                        className="w-full"
                        size="lg"
                        variant={centered ? 'default' : 'outline'}
                        disabled={Boolean(paying)}
                        aria-label={`${t('pay')} ${option.name}`}
                        onClick={() => onPay(option.plan)}
                      >
                        {t('pay')}
                      </Button>
                    )}
                    <div className="flex items-center gap-3">
                      <Separator className={cn('flex-1', !centered && 'opacity-60')} />
                      <ItemDescription className="text-xs uppercase tracking-wide">
                        {base
                          ? `${t('billing_everything_in')} ${base.name}${features.length ? `, ${t('billing_and_more')}` : ''}`
                          : t('billing_benefits_title')}
                      </ItemDescription>
                      <Separator className={cn('flex-1', !centered && 'opacity-60')} />
                    </div>
                    {features.length > 0 && (
                      <ul className="space-y-3">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <BadgeCheckIcon
                              className={cn(
                                'size-5 shrink-0',
                                centered ? 'text-status-success-indicator' : 'text-muted-foreground/60',
                              )}
                              aria-hidden
                            />
                            <ItemDescription className="line-clamp-none text-foreground">{feature}</ItemDescription>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
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
