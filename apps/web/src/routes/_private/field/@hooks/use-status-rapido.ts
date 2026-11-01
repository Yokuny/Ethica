import type { CompromissoMotivo, CompromissoStatus } from '@ethica/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patch } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { guardarStatus } from '@/lib/offline/store.js';
import { atualizarPendencias } from '@/lib/offline/sync.js';
import { compromissoKeys } from '@/query/compromisso.js';
import { vistoriaKeys } from '@/query/vistoria.js';

// Feita / adiada / ausente (CAM-01.2): com conexão vai direto; sem ela, fica no aparelho e
// sobe com a sincronização (AD-128).
export function useStatusRapido() {
  const queryClient = useQueryClient();

  async function marcar(compromissoId: string, status: CompromissoStatus, motivo?: CompromissoMotivo) {
    const res = navigator.onLine ? await patch(`/agenda/${compromissoId}`, { status, motivo }) : null;
    if (res?.success) {
      toast.success(t('status_updated'));
    } else if (!res || !navigator.onLine) {
      await guardarStatus({ compromissoId, status, motivo });
      await atualizarPendencias();
      toast.info(t('saved_on_device'));
    } else {
      toast.error(res.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: vistoriaKeys.all });
    await queryClient.invalidateQueries({ queryKey: compromissoKeys.all });
  }

  return { marcar };
}
