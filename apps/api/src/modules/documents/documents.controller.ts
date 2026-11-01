import { hasPermission } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { DocumentContext, DocumentsRouterDeps, FinanceReportQuery, GeneratedFile } from './documents.schema.js';
import * as documentsService from './documents.service.js';

type Providers = Pick<DocumentsRouterDeps, 'pdf' | 'storage'>;

const context = (req: Request): DocumentContext => {
  return {
    tenantId: req.tenantUser.tenant as string,
    userId: req.tenantUser.user,
    canSeeFinance: hasPermission(req.tenantUser.permissions, 'finance', 'view'),
    now: new Date(),
  };
};

const send = (res: Response, file: GeneratedFile): void => {
  res
    .set('Content-Type', file.type)
    .set('Content-Disposition', `attachment; filename="${file.name}"`)
    .set('Cache-Control', 'no-store')
    .end(file.conteudo);
};

// One handler per document: generates and returns the file; a case from another tenant is 404.
const handler =
  (generate: (req: Request, ctx: DocumentContext) => Promise<GeneratedFile>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      send(res, await generate(req, context(req)));
    } catch (e) {
      next(e instanceof CaseNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
    }
  };

export const sheet = (providers: Providers) =>
  handler((req, ctx) => documentsService.generateSheet(providers, ctx, req.params.id as string));

export const checklist = (providers: Providers) =>
  handler((req, ctx) => documentsService.generateChecklist(providers, ctx, req.params.id as string));

export const schedule = (providers: Providers) =>
  handler((_req, ctx) => documentsService.generateSchedule(providers, ctx));

export const finance = (providers: Providers) =>
  handler((req, ctx) => documentsService.generateFinance(providers, ctx, req.query as unknown as FinanceReportQuery));

export const stalled = (providers: Providers) =>
  handler((_req, ctx) => documentsService.generateStalled(providers, ctx));

export const runExport = handler((_req, ctx) => documentsService.exportData(ctx));
