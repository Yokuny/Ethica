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
import { cn } from 'cn';
import { BadgeCheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PLAN_OPTIONS } from '../@consts/plans.js';

type BillingPlansProps = {
  trialAvailable: boolean;
  paying?: BillingPlan;
  // Without it (member who is not admin) the prices show without the "Pagar" buttons.
  onPay?: (plan: BillingPlan) => void;
};

export function BillingPlans({ trialAvailable, paying, onPay }: BillingPlansProps) {
  const options = PLAN_OPTIONS.filter((option) => option.plan !== 'trial' || trialAvailable);
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
          return (
            <CarouselItem key={option.plan} className="sm:basis-[60%] md:basis-[45%] lg:basis-[34%]">
              <Card
                className={cn(
                  'h-full border shadow-none transition-[opacity,border-color] duration-200',
                  centered ? 'border-foreground/40' : 'opacity-50',
                )}
              >
                <CardHeader>
                  <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                    render={<h3 />}
                    className="text-base font-medium"
                  >
                    {option.name}
                  </ItemTitle>
                  <div className="mt-4">
                    <ItemTitle className="text-4xl font-semibold">
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
                    <ItemDescription className="text-xs uppercase tracking-wide">{t('includes')}</ItemDescription>
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
