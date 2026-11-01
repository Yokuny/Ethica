import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { patch, put, sendFile } from '@/lib/api/client.api.js';
import { type InspectionRecord, inspectionKeys } from '@/query/inspection.js';
import {
  deleteDraft,
  deleteMedia,
  deleteStatus,
  listDrafts,
  listMedia,
  listStatus,
  readDraft,
  saveDraft,
  storeMedia,
} from './store.js';

// Sending what stayed on the device (AD-128): status, then forms, then media. A form
// with 409 keeps the server version in the draft and waits for the expert to choose; media that failed
// stays for the next attempt, never disappears.
export type StateSync = {
  online: boolean;
  syncing: boolean;
  pending: number;
  conflicts: number;
  failures: number;
};

let state: StateSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  conflicts: 0,
  failures: 0,
};
const listeners = new Set<() => void>();
const publish = (partial: Partial<StateSync>) => {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
};

export const useStateSync = (): StateSync =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

// Counts what is still only on the device, without sending.
export const updateIssues = async () => {
  const [status, drafts, media] = await Promise.all([listStatus(), listDrafts(), listMedia()]);
  publish({
    pending: status.length + drafts.length + media.length,
    conflicts: drafts.filter((draft) => draft.conflict).length,
    failures: media.filter((media) => media.failure).length,
  });
};

export const runSync = async (queryClient: QueryClient) => {
  if (state.syncing || !navigator.onLine) return;
  publish({ syncing: true });
  try {
    for (const item of await listStatus()) {
      const res = await patch(`/agenda/${item.appointmentId}`, { status: item.status, reason: item.reason });
      if (res.success) await deleteStatus(item.appointmentId);
    }
    for (const draft of await listDrafts()) {
      if (draft.conflict) continue;
      const res = await put<InspectionRecord>(`/inspections/${draft.appointmentId}`, {
        version: draft.version,
        data: draft.data,
      });
      // An edit made during sending stays on the device, now over the new version.
      const current = await readDraft(draft.appointmentId);
      if (res.success && res.data) {
        if (current?.changedAt === draft.changedAt) await deleteDraft(draft.appointmentId);
        else if (current) await saveDraft({ ...current, version: res.data.version });
      } else if (res.data && current) await saveDraft({ ...current, conflict: res.data });
    }
    for (const media of await listMedia()) {
      const query = new URLSearchParams({ type: media.type, ...(media.caption ? { caption: media.caption } : {}) });
      const res = await sendFile(
        `/inspections/${media.appointmentId}/media/${media.mediaId}?${query.toString()}`,
        media.blob,
        media.mime,
        'PUT',
      );
      if (res.success) await deleteMedia(media.mediaId);
      else if (navigator.onLine) await storeFailure(media.mediaId, res.message ?? '');
    }
  } finally {
    publish({ syncing: false });
    await updateIssues();
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
  }
};

const storeFailure = async (mediaId: string, failure: string) => {
  const media = (await listMedia()).find((item) => item.mediaId === mediaId);
  if (media) await storeMedia({ ...media, failure });
};

// New attempt while something is pending: the `online` event does not always arrive (network that comes back
// without switching interface, API down on the first attempt).
const NEW_ATTEMPT_MS = 15_000;

let iniciado = false;
// Once per tab: sends on open, when the connection comes back, when the screen shows up again and,
// with something pending, at every interval.
export const startSync = (queryClient: QueryClient) => {
  if (iniciado) return;
  iniciado = true;
  const tentar = () => {
    publish({ online: navigator.onLine });
    void runSync(queryClient);
  };
  window.addEventListener('online', tentar);
  window.addEventListener('offline', () => publish({ online: false }));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tentar());
  setInterval(() => {
    if (state.pending > 0 || !state.online) tentar();
  }, NEW_ATTEMPT_MS);
  void updateIssues().then(() => runSync(queryClient));
};
