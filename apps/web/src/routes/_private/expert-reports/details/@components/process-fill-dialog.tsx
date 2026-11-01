import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { updateCaseMutation } from '@/query/case.js';
import type { ProcessFill } from '@/query/report.js';

// LMO-03: what the full process filled in the report, and the contract data found, which only go to
// the case if the expert saves them (AD-152).
export function ProcessFillDialog({
  caseId,
  result,
  onClose,
}: {
  caseId: string;
  result: ProcessFill;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const saveCase = useMutation(updateCaseMutation(queryClient));
  const { labor, missing } = result;
  const found = [
    labor.hireDate && { label: t('hiring_date'), value: formatDate(labor.hireDate) },
    labor.terminationDate && { label: t('termination_date'), value: formatDate(labor.terminationDate) },
    labor.claimantJob && { label: t('claimant_job'), value: labor.claimantJob },
    labor.location && { label: t('inspection_address'), value: labor.location },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <FormDialog title={t('process_filled')} description={t('process_filled_description')} onClose={onClose}>
      {found.length > 0 && (
        <div className="flex flex-col gap-2">
          <ItemTitle>{t('found_in_process')}</ItemTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {found.map((item) => (
              <div key={item.label} className="contents">
                <dt>
                  <ItemDescription>{item.label}</ItemDescription>
                </dt>
                <dd>
                  <ItemTitle>{item.value}</ItemTitle>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex flex-col gap-2">
          <ItemTitle>{t('not_found_in_process')}</ItemTitle>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((key) => (
              <Badge key={key} variant="warning">
                {t(key)}
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('close')}
        </Button>
        {found.length > 0 && (
          <Button
            type="button"
            disabled={saveCase.isPending}
            onClick={() =>
              saveCase.mutate(
                { id: caseId, data: labor },
                {
                  onSuccess: () => {
                    toast.success(t('saved_successfully'));
                    onClose();
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            {t('save_on_expert_case')}
          </Button>
        )}
      </div>
    </FormDialog>
  );
}
