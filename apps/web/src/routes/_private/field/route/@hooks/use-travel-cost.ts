import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import {
  createTransactionMutation,
  deleteTransactionMutation,
  type TransactionRecord,
  transactionsQuery,
} from '@/query/transaction.js';
import { type TravelCostForm, type TravelTarget, travelCostSchema } from '../@interface/travel-cost.interface.js';
import { splitCents, travelCost } from '../@utils/travel-cost.js';

export type RouteCase = { id: string; label: string };

// First and last day of the route (`YYYY-MM-DD`).
export type RouteDays = { from: string; to: string };

// CDE-01 to CDE-03: the route km fill the form until the expert types their own; the expense goes to one service
// order or is split in equal parts, one "Deslocamento" entry per service order, due on the first day of the route.
// AD-301: an expected travel expense of the same service orders within the route days is replaced, never doubled.
export function useTravelCost({ routeKm, cases, days }: { routeKm?: number; cases: RouteCase[]; days: RouteDays }) {
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
  const remove = useMutation(deleteTransactionMutation(queryClient));
  // Travel expenses already launched for these service orders in the route days, waiting for the choice to replace.
  const [launched, setLaunched] = useState<TransactionRecord[]>();

  // A new route updates the km while the field was not typed by hand.
  useEffect(() => {
    if (routeKm !== undefined && !form.getFieldState('km').isDirty) form.setValue('km', routeKm);
  }, [routeKm, form]);

  const targets =
    target === 'one' ? cases.filter((item) => item.id === oneCase) : cases.filter((item) => chosen.includes(item.id));
  const shares = splitCents(cost.totalCents, targets.length);
  // What each chosen service order gets when split, shown even before choosing to split.
  const splitShare = splitCents(cost.totalCents, chosen.length)[0] ?? 0;

  // Expected travel expenses of the chosen service orders due within the route days.
  async function findLaunched() {
    const pages = await Promise.all(
      targets.map((item) =>
        queryClient.fetchQuery(
          transactionsQuery({
            kind: 'expense',
            category: 'travel',
            state: 'expected',
            caseId: item.id,
            from: days.from,
            to: addDaysToDisplayDate(days.to, 1),
            limit: 100,
          }),
        ),
      ),
    );
    return pages.flatMap((page) => page.items);
  }

  // The new entries first and only then the old ones out: a failure in the middle leaves a duplicate, never a gap.
  async function save(replacing: TransactionRecord[]) {
    const km = (values.km ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    try {
      for (const [index, item] of targets.entries()) {
        await create.mutateAsync({
          kind: 'expense',
          category: 'travel',
          description: `${t('travel')} — ${km} km${targets.length > 1 ? ` (${index + 1}/${targets.length})` : ''}`,
          amountCents: shares[index] as number,
          dueDate: days.from,
          caseId: item.id,
        });
      }
      for (const item of replacing) await remove.mutateAsync({ id: item.id });
      setLaunched(undefined);
      toast.success(t(replacing.length ? 'travel_expense_replaced' : 'travel_expense_launched'));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function launch() {
    const valid = await form.trigger();
    if (!valid || !targets.length || cost.totalCents < 1) return;
    try {
      const found = await findLaunched();
      if (found.length) setLaunched(found);
      else await save([]);
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
    launched,
    replace: () => save(launched ?? []),
    dismiss: () => setLaunched(undefined),
    isPending: create.isPending || remove.isPending,
  };
}
