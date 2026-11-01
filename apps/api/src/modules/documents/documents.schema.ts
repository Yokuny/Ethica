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

// Quem gera o documento: o nome vai no [NOME_PERITO] e os dados profissionais na ficha.
// `canSeeFinance` decide se a ficha mostra valores (AD-107, AD-121).
export type DocumentContext = {
  tenantId: string;
  userId: string;
  canSeeFinance: boolean;
  now: Date;
};

export type DocumentBase = { identity: DocumentIdentity; expert: AccountView; geradoEm: Date };

export type SheetData = DocumentBase & {
  legalCase: CaseRecord;
  deadlines: DeadlineRecord[];
  appointments: AppointmentRecord[];
  finance?: CaseFinanceSummary;
};

export type ChecklistDados = DocumentBase & { legalCase: CaseRecord };

export type CronogramaDados = DocumentBase & { deadlines: DeadlineRecord[]; today: string };

export type FinanceData = DocumentBase & { period: FinanceReportQuery; report: FinanceReport };

export type StalledData = DocumentBase & { stalled: StalledCase[] };

export type GeneratedFile = { nome: string; tipo: string; conteudo: Buffer };
