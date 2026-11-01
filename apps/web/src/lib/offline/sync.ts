import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { patch, put, sendFile } from '@/lib/api/client.api.js';
import { type InspectionRecord, inspectionKeys } from '@/query/inspection.js';
import {
  apagarStatus,
  deleteDraft,
  deleteMedia,
  listarStatus,
  listDrafts,
  listMedia,
  readDraft,
  saveDraft,
  storeMedia,
} from './store.js';

// Envio do que ficou no aparelho (AD-128): status, depois formulários, depois mídias. Formulário
// com 409 guarda a versão do servidor no rascunho e espera o perito escolher; mídia que falhou
// fica para a próxima tentativa, nunca some.
export type EstadoSync = {
  online: boolean;
  syncing: boolean;
  pending: number;
  conflicts: number;
  falhas: number;
};

let estado: EstadoSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  conflicts: 0,
  falhas: 0,
};
const ouvintes = new Set<() => void>();
const publicar = (parcial: Partial<EstadoSync>) => {
  estado = { ...estado, ...parcial };
  for (const ouvinte of ouvintes) ouvinte();
};

export const useEstadoSync = (): EstadoSync =>
  useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => estado,
  );

// Conta o que ainda está só no aparelho, sem enviar.
export const atualizarPendencias = async () => {
  const [status, drafts, media] = await Promise.all([listarStatus(), listDrafts(), listMedia()]);
  publicar({
    pending: status.length + drafts.length + media.length,
    conflicts: drafts.filter((draft) => draft.conflict).length,
    falhas: media.filter((media) => media.falha).length,
  });
};

export const runSync = async (queryClient: QueryClient) => {
  if (estado.syncing || !navigator.onLine) return;
  publicar({ syncing: true });
  try {
    for (const item of await listarStatus()) {
      const res = await patch(`/agenda/${item.appointmentId}`, { status: item.status, reason: item.reason });
      if (res.success) await apagarStatus(item.appointmentId);
    }
    for (const draft of await listDrafts()) {
      if (draft.conflict) continue;
      const res = await put<InspectionRecord>(`/inspections/${draft.appointmentId}`, {
        versao: draft.versao,
        dados: draft.dados,
      });
      // Edição feita durante o envio continua no aparelho, agora sobre a versão nova.
      const atual = await readDraft(draft.appointmentId);
      if (res.success && res.data) {
        if (atual?.alteradoEm === draft.alteradoEm) await deleteDraft(draft.appointmentId);
        else if (atual) await saveDraft({ ...atual, versao: res.data.versao });
      } else if (res.data && atual) await saveDraft({ ...atual, conflict: res.data });
    }
    for (const media of await listMedia()) {
      const query = new URLSearchParams({ tipo: media.tipo, ...(media.caption ? { caption: media.caption } : {}) });
      const res = await sendFile(
        `/inspections/${media.appointmentId}/media/${media.mediaId}?${query.toString()}`,
        media.blob,
        media.mime,
        'PUT',
      );
      if (res.success) await deleteMedia(media.mediaId);
      else if (navigator.onLine) await guardarFalha(media.mediaId, res.message ?? '');
    }
  } finally {
    publicar({ syncing: false });
    await atualizarPendencias();
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
  }
};

const guardarFalha = async (mediaId: string, falha: string) => {
  const media = (await listMedia()).find((item) => item.mediaId === mediaId);
  if (media) await storeMedia({ ...media, falha });
};

// Nova tentativa enquanto houver pendência: o evento `online` nem sempre chega (rede que volta
// sem trocar de interface, API fora do ar na primeira tentativa).
const NEW_ATTEMPT_MS = 15_000;

let iniciado = false;
// Uma vez por aba: envia ao abrir, quando a conexão volta, quando a tela volta a aparecer e,
// com pendência, a cada intervalo.
export const iniciarSync = (queryClient: QueryClient) => {
  if (iniciado) return;
  iniciado = true;
  const tentar = () => {
    publicar({ online: navigator.onLine });
    void runSync(queryClient);
  };
  window.addEventListener('online', tentar);
  window.addEventListener('offline', () => publicar({ online: false }));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tentar());
  setInterval(() => {
    if (estado.pending > 0 || !estado.online) tentar();
  }, NEW_ATTEMPT_MS);
  void atualizarPendencias().then(() => runSync(queryClient));
};
