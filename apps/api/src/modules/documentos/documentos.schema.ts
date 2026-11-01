import type { FinanceiroReportQuery } from '@ethica/contracts';
import { financeiroReportQuerySchema, idSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import type { AppointmentRecord } from '../agenda/appointment.schema.js';
import type { CaseRecord, StalledCase } from '../case/case.schema.js';
import type { DeadlineRecord } from '../case/deadline.schema.js';
import type { CaseFinanceSummary, FinanceiroRelatorio } from '../financeiro/lancamento.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';

export type { DocumentIdentity, FinanceiroReportQuery };
export { financeiroReportQuerySchema };

export const documentCaseParamSchema = z.object({ id: idSchema }).strict();

export type DocumentosRouterDeps = { validToken: RequestHandler; pdf: PdfRenderer; storage?: FileStorage };

// Quem gera o documento: o nome vai no [NOME_PERITO] e os dados profissionais na ficha.
// `canSeeFinance` decide se a ficha mostra valores (AD-107, AD-121).
export type DocumentoContexto = {
  tenantId: string;
  userId: string;
  canSeeFinance: boolean;
  now: Date;
};

export type DocumentoBase = { identity: DocumentIdentity; expert: AccountView; geradoEm: Date };

export type SheetData = DocumentoBase & {
  legalCase: CaseRecord;
  deadlines: DeadlineRecord[];
  appointments: AppointmentRecord[];
  financeiro?: CaseFinanceSummary;
};

export type ChecklistDados = DocumentoBase & { legalCase: CaseRecord };

export type CronogramaDados = DocumentoBase & { deadlines: DeadlineRecord[]; today: string };

export type FinanceiroDados = DocumentoBase & { period: FinanceiroReportQuery; relatorio: FinanceiroRelatorio };

export type StalledData = DocumentoBase & { stalled: StalledCase[] };

export type GeneratedFile = { nome: string; tipo: string; conteudo: Buffer };
