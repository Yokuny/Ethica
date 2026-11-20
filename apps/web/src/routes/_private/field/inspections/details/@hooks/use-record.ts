import { type InspectionData, inspectionDataSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type Draft, deleteDraft, readDraft, saveDraft } from '@/lib/offline/store.js';
import { runSync, updateIssues } from '@/lib/offline/sync.js';
import { type DayInspection, type InspectionRecord, inspectionKeys } from '@/query/inspection.js';

// An empty optional field in the form becomes missing, as the contract expects.
const clear = <T>(amount: T): T => {
  if (Array.isArray(amount)) return amount.map(clear) as T;
  if (amount && typeof amount === 'object') {
    return Object.fromEntries(
      Object.entries(amount)
        .filter(([, item]) => item !== '' && item !== undefined && !(typeof item === 'number' && Number.isNaN(item)))
        .map(([key, item]) => [key, clear(item)]),
    ) as T;
  }
  return amount;
};

const SEND_AFTER_MS = 1500;

// Inspection record (CAM-02, CAM-05): each change stays on the device immediately and is sent
// shortly after, if there is a connection; the base version comes from the draft or the server (AD-128).
export function useRecord(item: DayInspection, initialDraft?: Draft) {
  const queryClient = useQueryClient();
  const appointmentId = item.appointment.id;
  const form = useForm<InspectionData>({
    resolver: zodResolver(inspectionDataSchema),
    defaultValues: initialDraft?.data ?? item.inspection.data,
  });
  const [conflict, setConflict] = useState<InspectionRecord | undefined>(initialDraft?.conflict);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ignore = useRef(false);

  const serverVersion = () =>
    queryClient.getQueryData<DayInspection>(inspectionKeys.detail(appointmentId))?.inspection.version ??
    item.inspection.version;

  async function send() {
    if (!(await form.trigger())) return;
    await runSync(queryClient);
    setConflict((await readDraft(appointmentId))?.conflict);
  }

  useEffect(() => {
    const signature = form.watch((values) => {
      if (ignore.current) return;
      void (async () => {
        const existing = await readDraft(appointmentId);
        await saveDraft({
          appointmentId,
          version: existing?.version ?? serverVersion(),
          data: clear(values) as InspectionData,
          changedAt: new Date().toISOString(),
          ...(existing?.conflict ? { conflict: existing.conflict } : {}),
        });
        await updateIssues();
      })();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void send(), SEND_AFTER_MS);
    });
    return () => {
      signature.unsubscribe();
      clearTimeout(timer.current);
    };
  });

  // Conflict: keep the device version (saves over the server one) or use the server one.
  async function keepMine() {
    const draft = await readDraft(appointmentId);
    if (!draft || !conflict) return;
    await saveDraft({ ...draft, version: conflict.version, conflict: undefined });
    setConflict(undefined);
    await send();
  }

  async function keepServer() {
    if (!conflict) return;
    await deleteDraft(appointmentId);
    ignore.current = true;
    form.reset(conflict.data);
    ignore.current = false;
    setConflict(undefined);
    await updateIssues();
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(appointmentId) });
  }

  return { form, conflict, send, keepMine, keepServer };
}
