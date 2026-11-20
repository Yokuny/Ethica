import { BILLING_PLAN_CENTS, type BillingPlan } from '@ethica/contracts';
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
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { cn } from 'cn';
import { BadgeCheckIcon } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type PlanOption, SINGLE_MONTH_OPTION, SUBSCRIPTION_OPTIONS, TRIAL_OPTION } from '../@consts/plans.js';

type BillingPlansProps = {
  trialAvailable: boolean;
  paying?: BillingPlan;
  // Without it (member who is not admin) the prices show without the "Pagar" buttons.
  onPay?: (plan: BillingPlan) => void;
};

// Side cards turn away and fade with the distance (in slides) from the centered one.
const slideStyle = (distance: number): CSSProperties => {
  const d = Math.max(-2, Math.min(2, distance));
  return {
    transform: `rotateY(${d * 38}deg) scale(${1 - Math.abs(d) * 0.12})`,
    opacity: 1 - Math.abs(d) * 0.5,
    zIndex: 20 - Math.round(Math.abs(d)) * 10,
  };
};

export function BillingPlans({ trialAvailable, paying, onPay }: BillingPlansProps) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [api, setApi] = useState<CarouselApi>();
  const [distances, setDistances] = useState<number[]>([]);
  const [selected, setSelected] = useState<number>();
  const options: PlanOption[] = [
    ...(trialAvailable ? [TRIAL_OPTION] : []),
    SUBSCRIPTION_OPTIONS[cycle],
    SINGLE_MONTH_OPTION,
  ];
  const subscriptionIndex = trialAvailable ? 1 : 0;

  useEffect(() => {
    if (!api) return;
    const update = () => {
      const snaps = api.scrollSnapList();
      const progress = api.scrollProgress();
      setDistances(snaps.map((snap) => (snap - progress) * (snaps.length - 1)));
      setSelected(api.selectedScrollSnap());
    };
    update();
    api.on('scroll', update).on('select', update).on('reInit', update);
    return () => {
      api.off('scroll', update).off('select', update).off('reInit', update);
    };
  }, [api]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <ToggleGroup value={cycle} onValueChange={(value) => setCycle(value as 'monthly' | 'yearly')}>
          <ToggleGroupItem value="monthly" className="w-28">
            {t('billing_monthly')}
          </ToggleGroupItem>
          <ToggleGroupItem value="yearly" className="w-28">
            {t('billing_yearly')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Carousel
        setApi={setApi}
        opts={{ align: 'center', containScroll: false, startIndex: subscriptionIndex }}
        style={{ perspective: 1200 }}
      >
        <CarouselContent className="py-2">
          {options.map((option, index) => {
            const centered = (selected ?? subscriptionIndex) === index;
            return (
              <CarouselItem key={option.plan} className="sm:basis-[75%] md:basis-[55%] lg:basis-[42%]">
                <div
                  className="relative h-full origin-center will-change-transform motion-reduce:transform-none!"
                  style={{
                    ...slideStyle(distances[index] ?? index - subscriptionIndex),
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <Card
                    className={cn(
                      'h-full border-2 transition-[border-color,box-shadow] duration-200',
                      centered ? 'border-primary shadow-lg shadow-primary/20' : 'border-border shadow-sm',
                    )}
                  >
                    <CardHeader>
                      <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                        render={<h3 />}
                        className="text-lg font-medium"
                      >
                        {option.name}
                      </ItemTitle>
                      <div className="mt-4">
                        <ItemTitle className="text-5xl font-semibold tracking-tight">
                          {formatMoney(BILLING_PLAN_CENTS[option.plan])}
                        </ItemTitle>
                        <ItemDescription>{option.period}</ItemDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 pt-2">
                      <ItemDescription className="line-clamp-3">{option.description}</ItemDescription>
                      {onPay && (
                        <Button
                          className="mt-6 w-full"
                          size="lg"
                          variant={centered ? 'default' : 'outline'}
                          disabled={Boolean(paying)}
                          aria-label={`${t('pay')} ${option.name}`}
                          onClick={() => onPay(option.plan)}
                        >
                          {t('pay')}
                        </Button>
                      )}
                      <div className="my-6 flex items-center gap-3">
                        <Separator className="flex-1" />
                        <ItemDescription className="text-xs uppercase tracking-wide opacity-50">
                          {t('includes')}
                        </ItemDescription>
                        <Separator className="flex-1" />
                      </div>
                      <ul className="space-y-4">
                        {option.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <BadgeCheckIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                            <ItemDescription className="line-clamp-none">{feature}</ItemDescription>
                          </li>
                        ))}
                      </ul>
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
    </div>
  );
}
