import type {
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
  CompleteReport,
  CreateReport,
  CreateTemplate,
  MoveSection,
  TemplateSection,
  UpdateReportSection,
  UpdateTemplate,
};
export {
  completeReportSchema,
  createReportSchema,
  createTemplateSchema,
  moveSectionSchema,
  templateSectionSchema,
  updateReportSectionSchema,
  updateTemplateSchema,
};

// Modelo padrão tem id fixo (AD-126); o do escritório, ObjectId.
const templateIdSchema = z.union([
  idSchema,
  z.enum([REPORT_DEFAULT_TEMPLATES.report, REPORT_DEFAULT_TEMPLATES.technical_opinion]),
]);

export const templateIdParamSchema = z.object({ id: templateIdSchema }).strict();
export const templateSectionParamSchema = z.object({ id: templateIdSchema, sectionId: idSchema }).strict();
export const reportIdParamSchema = z.object({ id: idSchema }).strict();
export const reportSectionParamSchema = z.object({ id: idSchema, sectionId: idSchema }).strict();

export const listTemplatesQuerySchema = z.object({ tipo: z.enum(REPORT_TYPES).optional() }).strict();
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
  nome: string;
  tipo: ReportType;
  // Modelo da biblioteca padrão: só leitura, clonável (AD-126).
  padrao: boolean;
  sections: TemplateSectionRecord[];
  updatedAt?: Date;
};

export type TemplateSummary = Omit<TemplateRecord, 'sections'> & { totalSections: number };

export type ReportSectionRecord = {
  id: string;
  titulo: string;
  level: number;
  titleOnly: boolean;
  pageBreak: boolean;
  variant: ReportVariant;
  html: string;
};

export type ReportSectionWrite = Omit<ReportSectionRecord, 'id'>;

// Marcadores sem valor por seção (AD-126): bloqueiam exportar e concluir.
export type ReportIssue = { sectionId: string; variables: ReportVariable[] };

export type ReportRecord = {
  id: string;
  caseId: string;
  // Enriquecido pelo service; ausente se a perícia não existe mais.
  caseNumber?: string;
  tipo: ReportType;
  status: ReportStatus;
  titulo: string;
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
  tipo: ReportType;
  titulo: string;
  templateName: string;
  sections: ReportSectionWrite[];
};

// O que o PDF e o Word recebem: seções com as variáveis já resolvidas de novo (AD-126).
export type ReportExportData = {
  report: ReportRecord;
  legalCase: CaseRecord;
  identity: DocumentIdentity;
  expert: AccountView;
  values: Partial<Record<ReportVariable, string>>;
  // `src` da foto no HTML → bytes (AD-129); foto que sumiu fica fora e o `img` some.
  photos: Record<string, { body: Buffer; mime: string }>;
  geradoEm: Date;
};
