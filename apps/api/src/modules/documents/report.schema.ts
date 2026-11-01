import type {
  ChooseReportSections,
  CompleteReport,
  CreateReport,
  CreateTemplate,
  MoveSection,
  ReportStatus,
  ReportType,
  ReportVariable,
  ReportVariant,
  TemplateSection,
  UpdateReportSection,
  UpdateTemplate,
} from '@ethica/contracts';
import {
  chooseReportSectionsSchema,
  completeReportSchema,
  createReportSchema,
  createTemplateSchema,
  idSchema,
  moveSectionSchema,
  REPORT_DEFAULT_TEMPLATES,
  REPORT_STATUS,
  REPORT_TYPES,
  templateSectionSchema,
  updateReportSectionSchema,
  updateTemplateSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import type { CaseRecord } from '../case/case.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';

export type {
  ChooseReportSections,
  CompleteReport,
  CreateReport,
  CreateTemplate,
  MoveSection,
  TemplateSection,
  UpdateReportSection,
  UpdateTemplate,
};
export {
  chooseReportSectionsSchema,
  completeReportSchema,
  createReportSchema,
  createTemplateSchema,
  moveSectionSchema,
  templateSectionSchema,
  updateReportSectionSchema,
  updateTemplateSchema,
};

// The default template has a fixed id (AD-126); the office one, an ObjectId.
const templateIdSchema = z.union([
  idSchema,
  z.enum([REPORT_DEFAULT_TEMPLATES.report, REPORT_DEFAULT_TEMPLATES.technical_opinion]),
]);

export const templateIdParamSchema = z.object({ id: templateIdSchema }).strict();
export const templateSectionParamSchema = z.object({ id: templateIdSchema, sectionId: idSchema }).strict();
export const reportIdParamSchema = z.object({ id: idSchema }).strict();
export const reportSectionParamSchema = z.object({ id: idSchema, sectionId: idSchema }).strict();

// Preview (LMO-04): the PDF also leaves with pending markers, which stay visible in the text.
export const reportPdfQuerySchema = z.object({ preview: z.enum(['true']).optional() }).strict();
export type ReportPdfQuery = z.infer<typeof reportPdfQuerySchema>;

export const listTemplatesQuerySchema = z.object({ type: z.enum(REPORT_TYPES).optional() }).strict();
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;

export const listReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(REPORT_STATUS).optional(),
    caseId: idSchema.optional(),
  })
  .strict();
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export type ReportRouterDeps = { validToken: RequestHandler; pdf: PdfRenderer; storage?: FileStorage };

export type TemplateSectionRecord = TemplateSection & { id: string };

export type TemplateRecord = {
  id: string;
  name: string;
  type: ReportType;
  // Default library template: read-only, clonable (AD-126).
  isDefault: boolean;
  sections: TemplateSectionRecord[];
  updatedAt?: Date;
};

export type TemplateSummary = Omit<TemplateRecord, 'sections'> & { totalSections: number };

export type ReportSectionRecord = {
  id: string;
  templateSectionId?: string;
  title: string;
  level: number;
  titleOnly: boolean;
  pageBreak: boolean;
  variant: ReportVariant;
  html: string;
};

export type ReportSectionWrite = Omit<ReportSectionRecord, 'id'>;

// Markers without a value by section (AD-126): they block export and completion.
export type ReportIssue = { sectionId: string; variables: ReportVariable[] };

export type ReportRecord = {
  id: string;
  caseId: string;
  // Enriched by the service; missing if the case no longer exists.
  caseNumber?: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  templateId?: string;
  templateName: string;
  sections: ReportSectionRecord[];
  issues: ReportIssue[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportListItem = Omit<ReportRecord, 'sections' | 'issues'> & { totalSections: number };

export type ReportCreateInput = {
  tenantId: string;
  caseId: string;
  userId: string;
  type: ReportType;
  title: string;
  templateId: string;
  templateName: string;
  sections: ReportSectionWrite[];
};

// New list of sections (LMO-01): a kept section carries its `id`; a new one does not.
export type ReportSectionsReplace = {
  templateId: string;
  templateName: string;
  sections: Array<ReportSectionWrite & { id?: string }>;
};

// What PDF and Word receive: sections with the variables resolved again (AD-126).
export type ReportExportData = {
  report: ReportRecord;
  legalCase: CaseRecord;
  identity: DocumentIdentity;
  expert: AccountView;
  values: Partial<Record<ReportVariable, string>>;
  // Photo `src` in the HTML → bytes (AD-129); a photo that is gone is left out and the `img` is dropped.
  photos: Record<string, { body: Buffer; mime: string }>;
  generatedAt: Date;
};
