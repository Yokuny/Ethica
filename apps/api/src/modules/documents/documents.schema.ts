import type { FinanceReportQuery } from '@ethica/contracts';
import { financeReportQuerySchema, idSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/file-storage.js';
import type { PdfRenderer } from '../../providers/pdf-renderer.js';
import type { AppointmentRecord } from '../agenda/appointment.schema.js';
import type { DayInspection } from '../agenda/inspection.schema.js';
import type { CaseRecord, StalledCase } from '../case/case.schema.js';
import type { CaseFinanceSummary, FinanceReport } from '../finance/transaction.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import type { DatedNotification } from '../notifications/notification.schema.js';

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
  deadlines: DatedNotification[];
  appointments: AppointmentRecord[];
  finance?: CaseFinanceSummary;
};

export type ChecklistData = DocumentBase & { legalCase: CaseRecord };

export type ScheduleData = DocumentBase & { deadlines: DatedNotification[]; today: string };

export type FinanceData = DocumentBase & { period: FinanceReportQuery; report: FinanceReport };

export type StalledData = DocumentBase & { stalled: StalledCase[] };

// Inspection term (AD-239): photos and signatures already as data URLs; a file that is gone is `undefined`.
export type InspectionTermData = DocumentBase & {
  item: DayInspection;
  photos: Array<{ src?: string; caption?: string }>;
  signatures: Map<string, string | undefined>;
};

export type GeneratedFile = { name: string; type: string; conteudo: Buffer };
