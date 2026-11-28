import { isTrackedNumber } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { AutomationOffer } from '@/components/automation-offer.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { lookupCourtProcess } from '@/query/automation.js';
import { hasAutomationSession, sessionQuery } from '@/query/session.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

const FILLED = ['courtType', 'court', 'division', 'docketingDate', 'subject'] as const;

// "Buscar no tribunal" (SGD-06), beside the process number of `add` and `details`: what the court knows fills only
// the empty fields, for the person to check before saving. Without the module, the offer (AD-276).
export function CourtLookupButton() {
  const session = useQuery(sessionQuery).data;
  const { control, getValues, setValue } = useFormContext<CaseFormValues>();
  const processNumber = useWatch({ control, name: 'processNumber' });
  const mutation = useMutation({ mutationFn: lookupCourtProcess });
  const ready = Boolean(processNumber && isTrackedNumber(processNumber));

  if (session && !hasAutomationSession(session)) {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="field" disabled={!ready}>
              <Search />
              {t('search_in_court')}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)]">
          <AutomationOffer />
        </PopoverContent>
      </Popover>
    );
  }

  const search = () =>
    mutation.mutate(processNumber as string, {
      onSuccess: (found) => {
        const empty = FILLED.filter((name) => found[name] && !getValues(name));
        for (const name of empty) setValue(name, found[name], { shouldDirty: true, shouldValidate: true });
        if (empty.length) toast.success(t('court_filled_review_before_saving'));
        else toast.info(t('court_nothing_to_fill'));
      },
      onError: (error: Error) => toast.error(error.message),
    });

  return (
    <Button type="button" variant="outline" size="field" disabled={!ready || mutation.isPending} onClick={search}>
      <Search />
      {mutation.isPending ? t('searching_in_court') : t('search_in_court')}
    </Button>
  );
}
