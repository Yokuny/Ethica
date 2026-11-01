import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ClipboardList, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { CaseReceipts } from '@/components/case-receipts.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { FormDialog } from '@/components/form-dialog.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import { sendNoticeMutation } from '@/query/inspection.js';
import { useAppointmentActions } from '../@hooks/use-appointment-actions.js';

type AppointmentDetailProps = { appointment: AppointmentRecord; onEdit: () => void; onClose: () => void };

// Leitura do compromisso com as ações do dia a dia: concluir, cancelar, remarcar e remover.
export function AppointmentDetail({ appointment, onEdit, onClose }: AppointmentDetailProps) {
  const { isPending, setStatus, isConfirmingDelete, askDelete, cancelDelete, handleDelete } = useAppointmentActions(
    appointment,
    onClose,
  );
  const scheduled = appointment.status === 'scheduled';
  const queryClient = useQueryClient();
  const notice = useMutation(sendNoticeMutation(queryClient));
  const lastNotice = appointment.notices?.at(-1);

  return (
    <FormDialog title={appointment.titulo} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge variant={APPOINTMENT_TYPE_VARIANT[appointment.tipo]}>{t(appointment.tipo)}</Badge>
        <Badge variant="secondary">{t(appointment.status)}</Badge>
        {appointment.origin === 'automatic' && <Badge variant="outline">{t('created_automatically')}</Badge>}
      </div>
      <ProductSpecs
        groups={[
          {
            id: 'quando',
            name: t('commitment'),
            specs: [
              { label: t('starts_at'), value: formatDateTime(appointment.inicio) },
              { label: t('ends_at'), value: formatDateTime(appointment.fim) },
              { label: t('location'), value: appointment.local || '-' },
              {
                label: t('expert_case'),
                value:
                  appointment.caseId && appointment.caseNumber ? (
                    <AppLink to="/expert-cases/details" search={{ id: appointment.caseId }}>
                      {appointment.caseNumber}
                    </AppLink>
                  ) : (
                    '-'
                  ),
              },
              { label: t('notes'), value: appointment.observacoes || '-' },
              {
                label: t('parties_notified'),
                value: lastNotice ? `${formatDateTime(lastNotice.at)} · ${lastNotice.recipients.join(', ')}` : '-',
              },
            ],
          },
        ]}
      />
      {appointment.caseId && <CaseReceipts caseId={appointment.caseId} />}
      {/* Campo (AD-130, AD-131): registro da vistoria no celular e aviso às partes por e-mail. */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/field/inspection" search={{ id: appointment.id }} />}
        >
          <ClipboardList />
          {t('inspection_record')}
        </Button>
        {appointment.caseId && (
          <Button
            variant="outline"
            disabled={notice.isPending}
            onClick={() =>
              notice.mutate(
                { id: appointment.id },
                { onSuccess: () => toast.success(t('notice_sent')), onError: (error) => toast.error(error.message) },
              )
            }
          >
            <Mail />
            {t('notify_parties')}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="destructive" disabled={isPending} onClick={askDelete}>
          {t('remove')}
        </Button>
        <div className="flex flex-wrap gap-2">
          {scheduled && (
            <Button variant="outline" disabled={isPending} onClick={() => setStatus('canceled')}>
              {t('cancel_commitment')}
            </Button>
          )}
          <Button variant="outline" disabled={isPending} onClick={onEdit}>
            {t('edit')}
          </Button>
          {scheduled && (
            <Button disabled={isPending} onClick={() => setStatus('done')}>
              {t('mark_as_done')}
            </Button>
          )}
        </div>
      </div>
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('remove_commitment_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={isPending}
          onConfirm={handleDelete}
          onClose={cancelDelete}
        />
      )}
    </FormDialog>
  );
}
