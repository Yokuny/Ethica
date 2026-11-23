import type { CourtProcessView, TrackedCase } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Automação Datajud (AD-270): what the worker brought from the court for the case; null until the first query.
export const automationKeys = {
  all: ['automation'] as const,
  courtProcess: (caseId: string) => [...automationKeys.all, 'court-process', caseId] as const,
};

export const courtProcessQuery = (caseId: string) =>
  queryOptions({
    queryKey: automationKeys.courtProcess(caseId),
    queryFn: async (): Promise<CourtProcessView | null> => {
      const res = await get<CourtProcessView | null>(`/automation/cases/${encodeURIComponent(caseId)}/court-process`);
      if (!res.success) throw new Error(res.message ?? t('load_error'));
      return res.data ?? null;
    },
  });

// The cases followed in court (the Automação page), the most recently read first.
export const trackedCasesQuery = queryOptions({
  queryKey: [...automationKeys.all, 'cases'] as const,
  queryFn: async (): Promise<TrackedCase[]> => {
    const res = await get<TrackedCase[]>('/automation/cases');
    if (!res.success) throw new Error(res.message ?? t('load_error'));
    return res.data ?? [];
  },
});
