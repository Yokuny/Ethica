import type {
  ChooseReportSections,
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
import { del, get, patch, post, put, sendFile } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';
import { caseKeys } from './case.js';
import { deadlineKeys } from './deadline.js';

// Mirrors the records of apps/api/src/modules/documents/report.schema.ts.
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
  // Template section it came from (LMO-01); missing in reports created before.
  templateSectionId?: string;
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
  templateId?: string;
  templateName: string;
  sections: ReportSectionRecord[];
  issues: { sectionId: string; variables: ReportVariable[] }[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};
export type ReportListItem = Omit<ReportRecord, 'sections' | 'issues'> & { totalSections: number };
// Full process read into the draft (LMO-03); `missing` are translation keys.
export type ProcessFill = {
  report: ReportRecord;
  labor: { hireDate?: string; terminationDate?: string; claimantJob?: string; location?: string };
  missing: string[];
};
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

// Report: the response is already the updated report; saves it in the detail cache and refetches the lists.
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

export const chooseReportSectionsMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ReportRecord, Error, { id: string; data: ChooseReportSections }> => ({
  mutationFn: async ({ id, data }) =>
    unwrap(await put<ReportRecord>(`/expert-reports/${id}/sections`, data), 'save_error'),
  onSuccess: (report) => updatedReport(queryClient, report),
});

// Photo sent in the report (LMO-05): the id is generated here, so a resend does not duplicate.
export const uploadReportPhotoMutation = (): UseMutationOptions<string, Error, { id: string; photo: Blob }> => ({
  mutationFn: async ({ id, photo }) =>
    unwrap(
      await sendFile<{ src: string }>(`/expert-reports/${id}/media/${crypto.randomUUID()}`, photo, 'image/jpeg', 'PUT'),
      'save_error',
    ).src,
});

export const fillReportFromProcessMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ProcessFill, Error, { id: string; file: File }> => ({
  mutationFn: async ({ id, file }) =>
    unwrap(await sendFile<ProcessFill>(`/expert-reports/${id}/process`, file, 'application/pdf'), 'action_error'),
  onSuccess: (result) => updatedReport(queryClient, result.report),
});

export const removeReportSectionMutation = (
  queryClient: QueryClient,
): UseMutationOptions<ReportRecord, Error, { id: string; sectionId: string }> => ({
  mutationFn: async ({ id, sectionId }) =>
    unwrap(await del<ReportRecord>(`/expert-reports/${id}/sections/${sectionId}`), 'remove_error'),
  onSuccess: (report) => updatedReport(queryClient, report),
});

// Completing with delivery touches the case deadline, movements and status (AD-126).
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

// Templates: saves the detail and refetches the template lists.
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
