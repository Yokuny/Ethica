import { Button } from '@ethica/ui/components/button';
import { Card, CardContent } from '@ethica/ui/components/card';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { RadioGroup, RadioGroupItem } from '@ethica/ui/components/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Calculator, Fuel } from 'lucide-react';
import type { ReactNode } from 'react';
import { Checkbox } from '@/components/checkbox.js';
import { MoneyField, NumberField } from '@/components/form-fields.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import { can, sessionQuery } from '@/query/session.js';
import { type RouteCase, useTravelCost } from '../@hooks/use-travel-cost.js';
import type { TravelTarget } from '../@interface/travel-cost.interface.js';

function Row({
  title,
  description,
  value,
  detail,
}: {
  title: string;
  description?: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div>
        <ItemTitle className="font-medium">{title}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </div>
      <div className="shrink-0 text-right">
        <ItemTitle className="justify-end font-semibold tabular-nums">{value}</ItemTitle>
        {detail && <ItemDescription className="tabular-nums">{detail}</ItemDescription>}
      </div>
    </div>
  );
}

// One choice of the launch, as a bordered row with the radio, the text and the amount on the right (CDE-03).
function Choice({
  value,
  selected,
  title,
  description,
  amount,
  children,
}: {
  value: TravelTarget;
  selected: boolean;
  title: string;
  description: string;
  amount: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('rounded-lg border p-4 transition-colors', selected && 'border-primary bg-muted/30')}>
      <ItemDescription
        render={
          // biome-ignore lint/a11y/noLabelWithoutControl: the radio is inside the label
          <label />
        }
        className="line-clamp-none flex cursor-pointer items-center gap-4 text-inherit"
      >
        <RadioGroupItem value={value} />
        <span className="flex flex-1 items-center justify-between gap-4">
          <span>
            <ItemTitle render={<span />} className="font-medium">
              {title}
            </ItemTitle>
            <ItemDescription render={<span />} className="block">
              {description}
            </ItemDescription>
          </span>
          <ItemTitle render={<span />} className="shrink-0 font-semibold tabular-nums">
            {amount}
          </ItemTitle>
        </span>
      </ItemDescription>
      {selected && children && <div className="mt-4 pl-8">{children}</div>}
    </div>
  );
}

// "Custo de deslocamento" below the field map (CDE-01 to CDE-03).
export function TravelCost({ routeKm, cases }: { routeKm?: number; cases: RouteCase[] }) {
  const { data: session } = useSuspenseQuery(sessionQuery);
  const travel = useTravelCost({ routeKm, cases });
  const { cost, shares } = travel;
  const canLaunch = can(session, 'finance', 'create') && cases.length > 0;
  const liters = cost.liters.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  return (
    // One card, like "Apoio no trajeto" beside it (AD-214): the inputs, the result and the launch.
    <Card className="min-w-0 gap-0 p-0">
      <CardContent className="grid gap-6 p-6">
        <div>
          <ItemTitle
            // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
            render={<h2 />}
            className="gap-2 font-semibold text-base"
          >
            <Calculator className="size-4" aria-hidden />
            {t('travel_cost')}
          </ItemTitle>
          <ItemDescription className="mt-1 line-clamp-none">{t('travel_cost_description')}</ItemDescription>
        </div>
        <Form {...travel.form}>
          <form noValidate onSubmit={(event) => event.preventDefault()} className="grid gap-4 sm:grid-cols-2">
            <NumberField
              control={travel.form.control}
              name="km"
              label={t('total_km')}
              placeholder="0"
              min={0}
              step={0.1}
            />
            <NumberField
              control={travel.form.control}
              name="kmPerLiter"
              label={t('vehicle_km_per_liter')}
              placeholder="12"
              min={0}
              step={0.1}
            />
            <MoneyField
              control={travel.form.control}
              name="fuelPriceCents"
              label={t('fuel_price_per_liter')}
              placeholder="R$ 0,00"
            />
            <MoneyField
              control={travel.form.control}
              name="tollsCents"
              label={t('tolls_on_route')}
              placeholder="R$ 0,00"
            />
          </form>
        </Form>
        <div>
          <Row title={t('fuel')} description={`${liters} L`} value={formatMoney(cost.fuelCents)} />
          <Row title={t('tolls_on_route')} value={formatMoney(travel.form.watch('tollsCents') ?? 0)} />
          <Row title={t('total')} value={formatMoney(cost.totalCents)} detail={`${formatMoney(cost.perKmCents)}/km`} />
        </div>
        {canLaunch && (
          <div className="space-y-3">
            <ItemTitle
              // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
              render={<h3 />}
              className="font-semibold"
            >
              {t('launch_as_expense')}
            </ItemTitle>
            <RadioGroup
              value={travel.target}
              onValueChange={(value) => travel.setTarget(value as TravelTarget)}
              className="gap-3"
            >
              <Choice
                value="one"
                selected={travel.target === 'one'}
                title={t('in_one_service_order')}
                description={t('in_one_service_order_description')}
                amount={formatMoney(cost.totalCents)}
              >
                <Select
                  items={cases.map((item) => ({ value: item.id, label: item.label }))}
                  value={travel.oneCase ?? null}
                  onValueChange={(value) => value && travel.setOneCase(value)}
                >
                  <SelectTrigger className="w-full" aria-label={t('service_order')}>
                    <SelectValue placeholder={t('service_order')} />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Choice>
              <Choice
                value="split"
                selected={travel.target === 'split'}
                title={t('split_among_service_orders')}
                description={t('split_among_service_orders_description')}
                amount={`${formatMoney(travel.splitShare)} ${t('per_service_order')}`}
              >
                <div className="grid gap-2">
                  {cases.map((item) => (
                    <Checkbox
                      key={item.id}
                      checked={travel.chosen.includes(item.id)}
                      onCheckedChange={() => travel.toggle(item.id)}
                      label={item.label}
                      labelClassName="normal-case tracking-normal"
                    />
                  ))}
                </div>
              </Choice>
            </RadioGroup>
            <Button
              disabled={travel.isPending || cost.totalCents < 1 || !shares.length}
              onClick={() => void travel.launch()}
            >
              <Fuel />
              {t('launch_as_expense')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
