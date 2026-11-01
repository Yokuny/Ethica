import type { AppointmentReason, AppointmentStatus } from '@ethica/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patch } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { guardarStatus } from '@/lib/offline/store.js';
import { updateIssues } from '@/lib/offline/sync.js';
import { appointmentKeys } from '@/query/appointment.js';
import { inspectionKeys } from '@/query/inspection.js';

// Feita / adiada / ausente (CAM-01.2): com conexão vai direto; sem ela, fica no aparelho e
// sobe com a sincronização (AD-128).
export function useQuickStatus() {
  const queryClient = useQueryClient();

  async function marcar(appointmentId: string, status: AppointmentStatus, reason?: AppointmentReason) {
    const res = navigator.onLine ? await patch(`/agenda/${appointmentId}`, { status, reason }) : null;
    if (res?.success) {
      toast.success(t('status_updated'));
    } else if (!res || !navigator.onLine) {
      await guardarStatus({ appointmentId, status, reason });
      await updateIssues();
      toast.info(t('saved_on_device'));
    } else {
      toast.error(res.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    await queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  }

  return { marcar };
}
