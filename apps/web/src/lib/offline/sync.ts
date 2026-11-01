import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { patch, put, sendFile } from '@/lib/api/client.api.js';
import { type VistoriaRecord, vistoriaKeys } from '@/query/vistoria.js';
import {
  apagarMidia,
  apagarRascunho,
  apagarStatus,
  guardarMidia,
  lerRascunho,
  listarMidias,
  listarRascunhos,
  listarStatus,
  salvarRascunho,
} from './store.js';

// Envio do que ficou no aparelho (AD-128): status, depois formulários, depois mídias. Formulário
// com 409 guarda a versão do servidor no rascunho e espera o perito escolher; mídia que falhou
// fica para a próxima tentativa, nunca some.
export type EstadoSync = {
  online: boolean;
  sincronizando: boolean;
  pending: number;
  conflitos: number;
  falhas: number;
};

let estado: EstadoSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  sincronizando: false,
  pending: 0,
  conflitos: 0,
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
  const [status, rascunhos, midias] = await Promise.all([listarStatus(), listarRascunhos(), listarMidias()]);
  publicar({
    pending: status.length + rascunhos.length + midias.length,
    conflitos: rascunhos.filter((rascunho) => rascunho.conflito).length,
    falhas: midias.filter((midia) => midia.falha).length,
  });
};

export const sincronizar = async (queryClient: QueryClient) => {
  if (estado.sincronizando || !navigator.onLine) return;
  publicar({ sincronizando: true });
  try {
    for (const item of await listarStatus()) {
      const res = await patch(`/agenda/${item.compromissoId}`, { status: item.status, motivo: item.motivo });
      if (res.success) await apagarStatus(item.compromissoId);
    }
    for (const rascunho of await listarRascunhos()) {
      if (rascunho.conflito) continue;
      const res = await put<VistoriaRecord>(`/inspections/${rascunho.compromissoId}`, {
        versao: rascunho.versao,
        dados: rascunho.dados,
      });
      // Edição feita durante o envio continua no aparelho, agora sobre a versão nova.
      const atual = await lerRascunho(rascunho.compromissoId);
      if (res.success && res.data) {
        if (atual?.alteradoEm === rascunho.alteradoEm) await apagarRascunho(rascunho.compromissoId);
        else if (atual) await salvarRascunho({ ...atual, versao: res.data.versao });
      } else if (res.data && atual) await salvarRascunho({ ...atual, conflito: res.data });
    }
    for (const midia of await listarMidias()) {
      const query = new URLSearchParams({ tipo: midia.tipo, ...(midia.legenda ? { legenda: midia.legenda } : {}) });
      const res = await sendFile(
        `/inspections/${midia.compromissoId}/media/${midia.midiaId}?${query.toString()}`,
        midia.blob,
        midia.mime,
        'PUT',
      );
      if (res.success) await apagarMidia(midia.midiaId);
      else if (navigator.onLine) await guardarFalha(midia.midiaId, res.message ?? '');
    }
  } finally {
    publicar({ sincronizando: false });
    await atualizarPendencias();
    await queryClient.invalidateQueries({ queryKey: vistoriaKeys.all });
  }
};

const guardarFalha = async (midiaId: string, falha: string) => {
  const midia = (await listarMidias()).find((item) => item.midiaId === midiaId);
  if (midia) await guardarMidia({ ...midia, falha });
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
    void sincronizar(queryClient);
  };
  window.addEventListener('online', tentar);
  window.addEventListener('offline', () => publicar({ online: false }));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tentar());
  setInterval(() => {
    if (estado.pending > 0 || !estado.online) tentar();
  }, NEW_ATTEMPT_MS);
  void atualizarPendencias().then(() => sincronizar(queryClient));
};
