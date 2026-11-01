import { type InspectionData, inspectionDataSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type Draft, deleteDraft, readDraft, saveDraft } from '@/lib/offline/store.js';
import { runSync, updateIssues } from '@/lib/offline/sync.js';
import { type DayInspection, type InspectionRecord, inspectionKeys } from '@/query/inspection.js';

// Campo opcional vazio no formulário vira ausente, como o contrato espera.
const limpar = <T>(amount: T): T => {
  if (Array.isArray(amount)) return amount.map(limpar) as T;
  if (amount && typeof amount === 'object') {
    return Object.fromEntries(
      Object.entries(amount)
        .filter(([, item]) => item !== '' && item !== undefined && !(typeof item === 'number' && Number.isNaN(item)))
        .map(([chave, item]) => [chave, limpar(item)]),
    ) as T;
  }
  return amount;
};

const ENVIO_APOS_MS = 1500;

// Registro da vistoria (CAM-02, CAM-05): cada mudança fica no aparelho na hora e é enviada
// pouco depois, se houver conexão; a versão de base vem do rascunho ou do servidor (AD-128).
export function useRecord(item: DayInspection, initialDraft?: Draft) {
  const queryClient = useQueryClient();
  const appointmentId = item.appointment.id;
  const form = useForm<InspectionData>({
    resolver: zodResolver(inspectionDataSchema),
    defaultValues: initialDraft?.dados ?? item.inspection.dados,
  });
  const [conflict, setConflict] = useState<InspectionRecord | undefined>(initialDraft?.conflict);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ignorar = useRef(false);

  const serverVersion = () =>
    queryClient.getQueryData<DayInspection>(inspectionKeys.detail(appointmentId))?.inspection.versao ??
    item.inspection.versao;

  async function enviar() {
    if (!(await form.trigger())) return;
    await runSync(queryClient);
    setConflict((await readDraft(appointmentId))?.conflict);
  }

  useEffect(() => {
    const signature = form.watch((values) => {
      if (ignorar.current) return;
      void (async () => {
        const existente = await readDraft(appointmentId);
        await saveDraft({
          appointmentId,
          versao: existente?.versao ?? serverVersion(),
          dados: limpar(values) as InspectionData,
          alteradoEm: new Date().toISOString(),
          ...(existente?.conflict ? { conflict: existente.conflict } : {}),
        });
        await updateIssues();
      })();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void enviar(), ENVIO_APOS_MS);
    });
    return () => {
      signature.unsubscribe();
      clearTimeout(timer.current);
    };
  });

  // Conflito: manter a versão do aparelho (grava sobre a do servidor) ou usar a do servidor.
  async function keepMine() {
    const draft = await readDraft(appointmentId);
    if (!draft || !conflict) return;
    await saveDraft({ ...draft, versao: conflict.versao, conflict: undefined });
    setConflict(undefined);
    await enviar();
  }

  async function keepServer() {
    if (!conflict) return;
    await deleteDraft(appointmentId);
    ignorar.current = true;
    form.reset(conflict.dados);
    ignorar.current = false;
    setConflict(undefined);
    await updateIssues();
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(appointmentId) });
  }

  return { form, conflict, enviar, keepMine, keepServer };
}
