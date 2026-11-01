import type { FinanceReportQuery } from '@ethica/contracts';
import { financeReportQuerySchema, idSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import type { AppointmentRecord } from '../agenda/appointment.schema.js';
import type { CaseRecord, StalledCase } from '../case/case.schema.js';
import type { DeadlineRecord } from '../case/deadline.schema.js';
import type { CaseFinanceSummary, FinanceReport } from '../finance/transaction.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';

export type { DocumentIdentity, FinanceReportQuery };
export { financeReportQuerySchema };

export const documentCaseParamSchema = z.object({ id: idSchema }).strict();

export type DocumentsRouterDeps = { validToken: RequestHandler; pdf: PdfRenderer; storage?: FileStorage };

// Whoever generates the document: the name goes into [NOME_PERITO] and the professional data into the sheet.
// `canSeeFinance` decides whether the sheet shows amounts (AD-107, AD-121).
export type DocumentContext = {
  tenantId: string;
  userId: string;
  canSeeFinance: boolean;
  now: Date;
};

export type DocumentBase = { identity: DocumentIdentity; expert: AccountView; generatedAt: Date };

export type SheetData = DocumentBase & {
  legalCase: CaseRecord;
  deadlines: DeadlineRecord[];
  appointments: AppointmentRecord[];
  finance?: CaseFinanceSummary;
};

export type ChecklistData = DocumentBase & { legalCase: CaseRecord };

export type ScheduleData = DocumentBase & { deadlines: DeadlineRecord[]; today: string };

export type FinanceData = DocumentBase & { period: FinanceReportQuery; report: FinanceReport };

export type StalledData = DocumentBase & { stalled: StalledCase[] };

export type GeneratedFile = { name: string; type: string; conteudo: Buffer };
