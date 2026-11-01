import type {
  CompleteReport,
  CreateReport,
  CreateTemplate,
  ReportStatus,
  ReportType,
  ReportVariable,
  ReportVariant,
  TemplateSection,
  UpdateReportSection,
} from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { del, get, patch, post, put } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';
import { deadlineKeys } from './deadline.js';

// Espelha os records de apps/api/src/modules/documentos/laudo.schema.ts.
export type TemplateSectionRecord = TemplateSection & { id: string };
export type TemplateRecord = {
  id: string;
  name: string;
  type: ReportType;
  isDefault: boolean;
  sections: TemplateSectionRecord[];
  updatedAt?: string;
};
export type TemplateSummary = Omit<TemplateRecord, 'sections'> & { totalSections: number };

export type ReportSectionRecord = {
  id: string;
  title: string;
  level: number;
  titleOnly: boolean;
  pageBreak: boolean;
  variant: ReportVariant;
  html: string;
};
export type ReportRecord = {
  id: string;
  caseId: string;
  caseNumber?: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  templateName: string;
  sections: ReportSectionRecord[];
  issues: { sectionId: string; variables: ReportVariable[] }[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
export type ReportListItem = Omit<ReportRecord, 'sections' | 'issues'> & { totalSections: number };
export type ReportsQueryParams = { page?: number; limit?: number; status?: ReportStatus; caseId?: string };

export const reportKeys = {
  all: ['report'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (params: ReportsQueryParams) => [...reportKeys.lists(), params] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
  templates: (type?: ReportType) => [...reportKeys.all, 'templates', type ?? 'all'] as const,
  template: (id: string) => [...reportKeys.all, 'template', id] as const,
};

const unwrap = <T>(res: { success: boolean; data?: T; message?: string }, fallback: string): T => {
  if (!res.success || res.data === undefined) throw new Error(res.message ?? t(fallback));
  return res.data;
};

const qs = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const reportsQuery = (params: ReportsQueryParams = {}) =>
  queryOptions({
    queryKey: reportKeys.list(params),
    queryFn: async () =>
      unwrap(await get<{ items: ReportListItem[]; total: number }>(`/expert-reports${qs(params)}`), 'load_error'),
  });

export const reportQuery = (id: string) =>
  queryOptions({
    queryKey: reportKeys.detail(id),
    queryFn: async () => unwrap(await get<ReportRecord>(`/expert-reports/${encodeURIComponent(id)}`), 'load_error'),
  });

export const templatesQuery = (type?: ReportType) =>
  queryOptions({
    queryKey: reportKeys.templates(type),
    queryFn: async () => unwrap(await get<TemplateSummary[]>(`/expert-reports/templates${qs({ type })}`), 'load_error'),
  });

export const templateQuery = (id: string) =>
  queryOptions({
    queryKey: reportKeys.template(id),
    queryFn: async () =>
      unwrap(await get<TemplateRecord>(`/expert-reports/templates/${encodeURIComponent(id)}`), 'load_error'),
  });

// Laudo: a resposta já é o laudo atualizado; grava no cache do detalhe e refaz as listas.
const updatedReport = (queryClient: QueryClient, report: ReportRecord) => {
  queryClient.setQueryData(reportKeys.detail(report.id), report);
  queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
};

export const createReportMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ReportRecord, Error, CreateReport> => ({
  mutationFn: async (data) => unwrap(await post<ReportRecord>('/expert-reports', data), 'create_error'),
  onSuccess: (report) => updatedReport(queryClient, report),
});

export const updateReportSectionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ReportRecord, Error, { id: string; sectionId: string; data: UpdateReportSection }> => ({
  mutationFn: async ({ id, sectionId, data }) =>
    unwrap(await patch<ReportRecord>(`/expert-reports/${id}/sections/${sectionId}`, data), 'save_error'),
  onSuccess: (report) => updatedReport(queryClient, report),
});

export const removeReportSectionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ReportRecord, Error, { id: string; sectionId: string }> => ({
  mutationFn: async ({ id, sectionId }) =>
    unwrap(await del<ReportRecord>(`/expert-reports/${id}/sections/${sectionId}`), 'remove_error'),
  onSuccess: (report) => updatedReport(queryClient, report),
});

// Concluir com a entrega mexe no prazo, nas movimentações e na etapa da perícia (AD-126).
export const completeReportMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ReportRecord, Error, { id: string; data: CompleteReport }> => ({
  mutationFn: async ({ id, data }) =>
    unwrap(await post<ReportRecord>(`/expert-reports/${id}/complete`, data), 'action_error'),
  onSuccess: (report) => {
    updatedReport(queryClient, report);
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
    queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
  },
});

export const deleteReportMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-reports/${id}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.lists() }),
});

// Modelos: grava o detalhe e refaz as listas de modelos.
const updatedTemplate = (queryClient: QueryClient, template: TemplateRecord) => {
  queryClient.setQueryData(reportKeys.template(template.id), template);
  queryClient.invalidateQueries({ queryKey: [...reportKeys.all, 'templates'] });
};

export const createTemplateMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TemplateRecord, Error, CreateTemplate> => ({
  mutationFn: async (data) => unwrap(await post<TemplateRecord>('/expert-reports/templates', data), 'create_error'),
  onSuccess: (template) => updatedTemplate(queryClient, template),
});

export const renameTemplateMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TemplateRecord, Error, { id: string; name: string }> => ({
  mutationFn: async ({ id, name }) =>
    unwrap(await patch<TemplateRecord>(`/expert-reports/templates/${id}`, { name }), 'save_error'),
  onSuccess: (template) => updatedTemplate(queryClient, template),
});

export const deleteTemplateMutation = (queryClient: QueryClient): UseMutationOptions<void, Error, { id: string }> => ({
  mutationFn: async ({ id }) => {
    const res = await del<never>(`/expert-reports/templates/${id}`);
    if (!res.success) throw new Error(res.message ?? t('remove_error'));
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: [...reportKeys.all, 'templates'] }),
});

export const saveTemplateSectionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TemplateRecord, Error, { id: string; sectionId?: string; data: TemplateSection }> => ({
  mutationFn: async ({ id, sectionId, data }) =>
    unwrap(
      sectionId
        ? await put<TemplateRecord>(`/expert-reports/templates/${id}/sections/${sectionId}`, data)
        : await post<TemplateRecord>(`/expert-reports/templates/${id}/sections`, data),
      'save_error',
    ),
  onSuccess: (template) => updatedTemplate(queryClient, template),
});

export const removeTemplateSectionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TemplateRecord, Error, { id: string; sectionId: string }> => ({
  mutationFn: async ({ id, sectionId }) =>
    unwrap(await del<TemplateRecord>(`/expert-reports/templates/${id}/sections/${sectionId}`), 'remove_error'),
  onSuccess: (template) => updatedTemplate(queryClient, template),
});

export const moveTemplateSectionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<TemplateRecord, Error, { id: string; sectionId: string; direction: 'up' | 'down' }> => ({
  mutationFn: async ({ id, sectionId, direction }) =>
    unwrap(
      await post<TemplateRecord>(`/expert-reports/templates/${id}/sections/${sectionId}/move`, { direction }),
      'save_error',
    ),
  onSuccess: (template) => updatedTemplate(queryClient, template),
});
