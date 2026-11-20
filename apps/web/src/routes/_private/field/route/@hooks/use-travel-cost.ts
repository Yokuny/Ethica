import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { createTransactionMutation } from '@/query/transaction.js';
import { type TravelCostForm, type TravelTarget, travelCostSchema } from '../@interface/travel-cost.interface.js';
import { splitCents, travelCost } from '../@utils/travel-cost.js';

export type RouteCase = { id: string; label: string };

// CDE-01 to CDE-03: the route km fill the form until the expert types their own; the expense goes to one service
// order or is split in equal parts, one "Deslocamento" entry per service order.
export function useTravelCost({ routeKm, cases }: { routeKm?: number; cases: RouteCase[] }) {
  const queryClient = useQueryClient();
  const form = useForm<TravelCostForm>({
    resolver: zodResolver(travelCostSchema),
    defaultValues: { km: routeKm ?? 0, kmPerLiter: undefined, fuelPriceCents: 0, tollsCents: 0 },
  });
  const values = useWatch({ control: form.control });
  const cost = travelCost({
    km: values.km ?? 0,
    kmPerLiter: values.kmPerLiter ?? 0,
    fuelPriceCents: values.fuelPriceCents ?? 0,
    tollsCents: values.tollsCents ?? 0,
  });
  const [target, setTarget] = useState<TravelTarget>('one');
  const [oneCase, setOneCase] = useState<string | undefined>(cases[0]?.id);
  const [chosen, setChosen] = useState<string[]>(cases.map((item) => item.id));
  const create = useMutation(createTransactionMutation(queryClient));

  // A new route updates the km while the field was not typed by hand.
  useEffect(() => {
    if (routeKm !== undefined && !form.getFieldState('km').isDirty) form.setValue('km', routeKm);
  }, [routeKm, form]);

  const targets =
    target === 'one' ? cases.filter((item) => item.id === oneCase) : cases.filter((item) => chosen.includes(item.id));
  const shares = splitCents(cost.totalCents, targets.length);
  // What each chosen service order gets when split, shown even before choosing to split.
  const splitShare = splitCents(cost.totalCents, chosen.length)[0] ?? 0;

  async function launch() {
    const valid = await form.trigger();
    if (!valid || !targets.length || cost.totalCents < 1) return;
    const km = (values.km ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    try {
      for (const [index, item] of targets.entries()) {
        await create.mutateAsync({
          kind: 'expense',
          category: 'travel',
          description: `${t('travel')} — ${km} km${targets.length > 1 ? ` (${index + 1}/${targets.length})` : ''}`,
          amountCents: shares[index] as number,
          dueDate: formatDisplayDate(new Date()),
          caseId: item.id,
        });
      }
      toast.success(t('travel_expense_launched'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return {
    form,
    cost,
    target,
    setTarget,
    oneCase,
    setOneCase,
    chosen,
    toggle: (id: string) => setChosen((now) => (now.includes(id) ? now.filter((item) => item !== id) : [...now, id])),
    shares,
    splitShare,
    launch,
    isPending: create.isPending,
  };
}
