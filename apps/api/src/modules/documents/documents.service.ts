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
import { checklistHtml, cronogramaHtml, financeHtml, sheetHtml, stalledHtml } from './documents.templates.js';

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

const base = async (providers: Providers, ctx: DocumentContext): Promise<DocumentBase> => {
  const [identity, expert] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
  ]);
  return { identity, expert, geradoEm: ctx.now };
};

const pdf = async (providers: Providers, nome: string, document: PdfDocument): Promise<GeneratedFile> => ({
  nome,
  tipo: 'application/pdf',
  conteudo: await providers.pdf.render(document),
});

// DOC-02: o resumo financeiro só entra para admin/manager (AD-107).
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
    cronogramaHtml({ ...baseData, deadlines, today: dateInDisplayTz(ctx.now) }),
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

// CSV da exportação (AD-122): mesmo formato da importação (`;`, UTF-8 com BOM, AD-115).
type Cell = string | number | boolean | Date | undefined | null;
const cell = (value: Cell): string => {
  const texto = value instanceof Date ? value.toISOString() : String(value ?? '');
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};
export const toCsv = <T>(columns: Array<[string, (item: T) => Cell]>, itens: T[]): string =>
  `﻿${[columns.map(([nome]) => nome), ...itens.map((item) => columns.map(([, amount]) => amount(item)))]
    .map((row) => row.map((amount) => cell(amount as Cell)).join(';'))
    .join('\r\n')}\r\n`;

// DOC-04: um CSV por entidade do tenant num ZIP; registra quem exportou e quando.
export const exportData = async (ctx: DocumentContext): Promise<GeneratedFile> => {
  const { tenantId } = ctx;
  const [cases, parties, deadlines, appointments, transactions, usuarios, opportunities] = await Promise.all([
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
        ['partes', (p) => p.parties.map((party) => `${party.side}:${party.tipo}:${party.nome}`).join(' | ')],
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
        ['movimentacoes', (p) => p.movements.map((m) => `${m.data}:${m.tipo}`).join(' | ')],
        ['observacoes', (p) => p.observacoes],
        ['createdAt', (p) => p.createdAt],
      ],
      cases,
    ),
    'partes.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['tipo', (p) => p.tipo],
        ['nome', (p) => p.nome],
        ['documento', (p) => p.document],
        ['oab', (p) => p.oab],
        ['email', (p) => p.email],
        ['telefone', (p) => p.telefone],
        ['createdAt', (p) => p.createdAt],
      ],
      parties,
    ),
    'prazos.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['periciaId', (p) => p.caseId],
        ['titulo', (p) => p.titulo],
        ['vencimento', (p) => p.dueDate],
        ['status', (p) => p.status],
        ['protocoladoEm', (p) => p.filedDate],
        ['observacoes', (p) => p.observacoes],
      ],
      deadlines,
    ),
    'compromissos.csv': toCsv(
      [
        ['id', (c) => c.id],
        ['periciaId', (c) => c.caseId],
        ['tipo', (c) => c.tipo],
        ['titulo', (c) => c.titulo],
        ['inicio', (c) => c.inicio],
        ['fim', (c) => c.fim],
        ['local', (c) => c.local],
        ['status', (c) => c.status],
        ['origem', (c) => c.origin],
        ['observacoes', (c) => c.observacoes],
      ],
      appointments,
    ),
    'lancamentos.csv': toCsv(
      [
        ['id', (l) => l.id],
        ['periciaId', (l) => l.caseId],
        ['natureza', (l) => l.kind],
        ['categoria', (l) => l.category],
        ['descricao', (l) => l.descricao],
        ['valorCents', (l) => l.amountCents],
        ['vencimento', (l) => l.dueDate],
        ['status', (l) => l.status],
        ['liquidadoEm', (l) => l.settledDate],
        ['recebidoCents', (l) => l.receivedCents],
        ['parcelas', (l) => l.installments.map((p) => `${p.data}:${p.amountCents}`).join(' | ')],
      ],
      transactions,
    ),
    // Sem senha, sem hashes de sessão ou do feed (AD-122).
    'usuarios.csv': toCsv(
      [
        ['id', (u) => u.id],
        ['name', (u) => u.name],
        ['email', (u) => u.email],
        ['role', (u) => u.role.join(' | ')],
        ['active', (u) => u.active],
        ['createdAt', (u) => u.createdAt],
      ],
      usuarios,
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
        ['observacoes', (o) => o.observacoes],
        ['createdAt', (o) => o.createdAt],
      ],
      opportunities,
    ),
  };
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([nome, csv]) => [nome, strToU8(csv)])));
  return {
    nome: `ethica-dados-${dateInDisplayTz(ctx.now)}.zip`,
    tipo: 'application/zip',
    conteudo: Buffer.from(zip),
  };
};
