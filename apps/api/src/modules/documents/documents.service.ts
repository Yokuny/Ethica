import { dateInDisplayTz } from '@ethica/db';
import { strToU8, zipSync } from 'fflate';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfDocument, PdfRenderer } from '../../providers/pdfRenderer.js';
import * as appointmentService from '../agenda/appointment.service.js';
import * as caseService from '../case/case.service.js';
import * as deadlineService from '../case/deadline.service.js';
import * as partyService from '../case/party.service.js';
import * as transactionService from '../finance/transaction.service.js';
import * as accountService from '../identity/account.service.js';
import * as authService from '../identity/auth.service.js';
import * as officeService from '../identity/office.service.js';
import * as opportunityService from '../prospecting/opportunity.service.js';
import type { DocumentBase, DocumentContext, FinanceReportQuery, GeneratedFile } from './documents.schema.js';
import { checklistHtml, financeHtml, scheduleHtml, sheetHtml, stalledHtml } from './documents.templates.js';

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

const base = async (providers: Providers, ctx: DocumentContext): Promise<DocumentBase> => {
  const [identity, expert] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
  ]);
  return { identity, expert, generatedAt: ctx.now };
};

const pdf = async (providers: Providers, name: string, document: PdfDocument): Promise<GeneratedFile> => ({
  name,
  type: 'application/pdf',
  conteudo: await providers.pdf.render(document),
});

// DOC-02: the finance summary only goes in for admin/manager (AD-107).
export const generateSheet = async (providers: Providers, ctx: DocumentContext, caseId: string) => {
  const legalCase = await caseService.getCase(ctx.tenantId, caseId);
  const [baseData, deadlines, appointments, finance] = await Promise.all([
    base(providers, ctx),
    deadlineService.listCaseDeadlines(ctx.tenantId, caseId),
    appointmentService.listByCase(ctx.tenantId, caseId),
    ctx.canSeeFinance ? transactionService.caseSummary(ctx.tenantId, caseId) : undefined,
  ]);
  return pdf(
    providers,
    `ficha-${legalCase.processNumber}.pdf`,
    sheetHtml({ ...baseData, legalCase, deadlines, appointments, finance }),
  );
};

export const generateChecklist = async (providers: Providers, ctx: DocumentContext, caseId: string) => {
  const legalCase = await caseService.getCase(ctx.tenantId, caseId);
  return pdf(
    providers,
    `checklist-${legalCase.processNumber}.pdf`,
    checklistHtml({ ...(await base(providers, ctx)), legalCase }),
  );
};

export const generateSchedule = async (providers: Providers, ctx: DocumentContext) => {
  const [baseData, deadlines] = await Promise.all([
    base(providers, ctx),
    deadlineService.listPendingDeadlines(ctx.tenantId),
  ]);
  return pdf(
    providers,
    'cronograma-de-prazos.pdf',
    scheduleHtml({ ...baseData, deadlines, today: dateInDisplayTz(ctx.now) }),
  );
};

export const generateFinance = async (providers: Providers, ctx: DocumentContext, period: FinanceReportQuery) => {
  const [baseData, report] = await Promise.all([
    base(providers, ctx),
    transactionService.reportPeriod(ctx.tenantId, period),
  ]);
  return pdf(
    providers,
    `relatorio-financeiro-${period.from}-a-${period.to}.pdf`,
    financeHtml({ ...baseData, period, report }),
  );
};

export const generateStalled = async (providers: Providers, ctx: DocumentContext) => {
  const [baseData, stalled] = await Promise.all([base(providers, ctx), caseService.listStalled(ctx.tenantId, ctx.now)]);
  return pdf(providers, 'pericias-paradas.pdf', stalledHtml({ ...baseData, stalled }));
};

// Export CSV (AD-122): same format as the import (`;`, UTF-8 with BOM, AD-115).
type Cell = string | number | boolean | Date | undefined | null;
const cell = (value: Cell): string => {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '');
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export const toCsv = <T>(columns: Array<[string, (item: T) => Cell]>, items: T[]): string =>
  `﻿${[columns.map(([name]) => name), ...items.map((item) => columns.map(([, amount]) => amount(item)))]
    .map((row) => row.map((amount) => cell(amount as Cell)).join(';'))
    .join('\r\n')}\r\n`;

// DOC-04: one CSV per tenant entity in a ZIP; records who exported and when.
export const exportData = async (ctx: DocumentContext): Promise<GeneratedFile> => {
  const { tenantId } = ctx;
  const [cases, parties, deadlines, appointments, transactions, users, opportunities] = await Promise.all([
    caseService.listForExport(tenantId),
    partyService.listForExport(tenantId),
    deadlineService.listForExport(tenantId),
    appointmentService.listForExport(tenantId),
    transactionService.listForExport(tenantId),
    authService.listUserDirectory(tenantId),
    opportunityService.listForExport(tenantId),
  ]);
  const files = {
    'pericias.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['numeroProcesso', (p) => p.processNumber],
        ['justica', (p) => p.courtType],
        ['papel', (p) => p.role],
        ['tribunal', (p) => p.court],
        ['vara', (p) => p.division],
        ['comarca', (p) => p.district],
        ['objeto', (p) => p.subject],
        ['status', (p) => p.status],
        ['partes', (p) => p.parties.map((party) => `${party.side}:${party.type}:${party.name}`).join(' | ')],
        ['dataNomeacao', (p) => p.nominationDate],
        ['honorariosPropostosCents', (p) => p.proposedFeesCents],
        ['honorariosFixadosCents', (p) => p.fixedFeesCents],
        ['dataAutuacao', (p) => p.docketingDate],
        ['dataAdmissao', (p) => p.hireDate],
        ['dataDemissao', (p) => p.terminationDate],
        ['funcaoReclamante', (p) => p.claimantJob],
        ['periodoImprescritoInicio', (p) => p.nonPrescribedPeriodStart],
        ['periodoImprescritoFim', (p) => p.nonPrescribedPeriodEnd],
        ['localPericia', (p) => p.location],
        ['movimentacoes', (p) => p.movements.map((m) => `${m.date}:${m.type}`).join(' | ')],
        ['notes', (p) => p.notes],
        ['createdAt', (p) => p.createdAt],
      ],
      cases,
    ),
    'partes.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['type', (p) => p.type],
        ['name', (p) => p.name],
        ['documento', (p) => p.document],
        ['oab', (p) => p.oab],
        ['email', (p) => p.email],
        ['phone', (p) => p.phone],
        ['createdAt', (p) => p.createdAt],
      ],
      parties,
    ),
    'prazos.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['periciaId', (p) => p.caseId],
        ['title', (p) => p.title],
        ['vencimento', (p) => p.dueDate],
        ['status', (p) => p.status],
        ['protocoladoEm', (p) => p.filedDate],
        ['notes', (p) => p.notes],
      ],
      deadlines,
    ),
    'compromissos.csv': toCsv(
      [
        ['id', (c) => c.id],
        ['periciaId', (c) => c.caseId],
        ['type', (c) => c.type],
        ['title', (c) => c.title],
        ['start', (c) => c.start],
        ['end', (c) => c.end],
        ['local', (c) => c.location],
        ['status', (c) => c.status],
        ['origem', (c) => c.origin],
        ['notes', (c) => c.notes],
      ],
      appointments,
    ),
    'lancamentos.csv': toCsv(
      [
        ['id', (l) => l.id],
        ['periciaId', (l) => l.caseId],
        ['natureza', (l) => l.kind],
        ['categoria', (l) => l.category],
        ['description', (l) => l.description],
        ['valorCents', (l) => l.amountCents],
        ['vencimento', (l) => l.dueDate],
        ['status', (l) => l.status],
        ['liquidadoEm', (l) => l.settledDate],
        ['recebidoCents', (l) => l.receivedCents],
        ['parcelas', (l) => l.installments.map((p) => `${p.date}:${p.amountCents}`).join(' | ')],
      ],
      transactions,
    ),
    // No password, no session or feed hashes (AD-122).
    'usuarios.csv': toCsv(
      [
        ['id', (u) => u.id],
        ['name', (u) => u.name],
        ['email', (u) => u.email],
        ['role', (u) => u.role.join(' | ')],
        ['active', (u) => u.active],
        ['createdAt', (u) => u.createdAt],
      ],
      users,
    ),
    'oportunidades.csv': toCsv(
      [
        ['id', (o) => o.id],
        ['numeroProcesso', (o) => o.processNumber],
        ['tribunal', (o) => o.court],
        ['caseClass', (o) => o.caseClass],
        ['subjects', (o) => o.subjects.join(' | ')],
        ['courtUnit', (o) => o.courtUnit],
        ['status', (o) => o.status],
        ['periciaId', (o) => o.caseId],
        ['notes', (o) => o.notes],
        ['createdAt', (o) => o.createdAt],
      ],
      opportunities,
    ),
  };
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, csv]) => [name, strToU8(csv)])));
  return {
    name: `ethica-data-${dateInDisplayTz(ctx.now)}.zip`,
    type: 'application/zip',
    conteudo: Buffer.from(zip),
  };
};
