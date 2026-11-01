import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DatePicker } from '@/components/date-picker.js';
import { ALERT_VARIANT, DEADLINE_STATUS_VARIANT, deadlineAlert } from '@/components/deadline-labels.js';
import { FormDialog } from '@/components/form-dialog.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DeadlineRecord, deleteDeadlineMutation, updateDeadlineMutation } from '@/query/deadline.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : '-');

type DeadlineDialogProps = {
  deadline: DeadlineRecord;
  onClose: () => void;
  // Only the case detail edits title/due date; the agenda opens the case.
  onEdit?: () => void;
  // Extra block below the read view (the agenda shows the case receipts).
  children?: ReactNode;
};

// Deadline read view with the day-to-day actions (AD-109): file with the delivery
// date, mark missed, reopen and remove. Used by the case and by the agenda.
export function DeadlineDialog({ deadline, onClose, onEdit, children }: DeadlineDialogProps) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation(updateDeadlineMutation(queryClient));
  const deleteMutation = useMutation(deleteDeadlineMutation(queryClient));
  const today = formatDisplayDate(new Date());
  const [filedDate, setFiledDate] = useState(today);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isPending = updateMutation.isPending || deleteMutation.isPending;
  const alert = deadlineAlert(deadline, today);
  const onError = (error: Error) => toast.error(error.message);

  function setStatus(data: Parameters<typeof updateMutation.mutate>[0]['data']) {
    updateMutation.mutate({ id: deadline.id, data }, { onSuccess: onClose, onError });
  }

  function handleDelete() {
    deleteMutation.mutate({ id: deadline.id }, { onSuccess: onClose, onError });
  }

  return (
    <FormDialog title={deadline.title} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge variant={DEADLINE_STATUS_VARIANT[deadline.status]}>{t(deadline.status)}</Badge>
        {alert && <Badge variant={ALERT_VARIANT[alert]}>{t(alert)}</Badge>}
      </div>
      <ProductSpecs
        groups={[
          {
            id: 'deadline',
            name: t('deadline'),
            specs: [
              { label: t('due_date'), value: day(deadline.dueDate) },
              { label: t('filed_on'), value: day(deadline.filedDate) },
              {
                label: t('expert_case'),
                value: deadline.caseNumber ? (
                  <AppLink to="/expert-cases/details" search={{ id: deadline.caseId }}>
                    {deadline.caseNumber}
                  </AppLink>
                ) : (
                  '-'
                ),
              },
              { label: t('notes'), value: deadline.notes || '-' },
            ],
          },
        ]}
      />
      {children}
      {deadline.status === 'pending' && (
        <div className="grid gap-2">
          <ItemDescription className="line-clamp-none">{t('filing_date')}</ItemDescription>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-48 flex-1">
              <DatePicker
                value={filedDate}
                onChange={(value) => setFiledDate(value ?? '')}
                placeholder={t('choose_day')}
              />
            </div>
            <Button
              size="field"
              disabled={isPending || !filedDate}
              onClick={() => setStatus({ status: 'filed', filedDate })}
            >
              {t('register_filing')}
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="destructive" disabled={isPending} onClick={() => setIsConfirmingDelete(true)}>
          {t('remove')}
        </Button>
        <div className="flex flex-wrap gap-2">
          {deadline.status === 'pending' ? (
            <Button variant="outline" disabled={isPending} onClick={() => setStatus({ status: 'missed' })}>
              {t('mark_as_missed')}
            </Button>
          ) : (
            <Button variant="outline" disabled={isPending} onClick={() => setStatus({ status: 'pending' })}>
              {t('reopen')}
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" disabled={isPending} onClick={onEdit}>
              {t('edit')}
            </Button>
          )}
        </div>
      </div>
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('remove_deadline_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => setIsConfirmingDelete(false)}
        />
      )}
    </FormDialog>
  );
}
