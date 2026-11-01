import { pode } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { DocumentContext, DocumentsRouterDeps, FinanceReportQuery, GeneratedFile } from './documents.schema.js';
import * as documentsService from './documents.service.js';

type Providers = Pick<DocumentsRouterDeps, 'pdf' | 'storage'>;

const contexto = (req: Request): DocumentContext => {
  return {
    tenantId: req.tenantUser.tenant as string,
    userId: req.tenantUser.user,
    canSeeFinance: pode(req.tenantUser.permissoes, 'finance', 'view'),
    now: new Date(),
  };
};

const enviar = (res: Response, file: GeneratedFile): void => {
  res
    .set('Content-Type', file.tipo)
    .set('Content-Disposition', `attachment; filename="${file.nome}"`)
    .set('Cache-Control', 'no-store')
    .end(file.conteudo);
};

// Um handler por documento: gera e devolve o arquivo; perícia de outro tenant é 404.
const handler =
  (generate: (req: Request, ctx: DocumentContext) => Promise<GeneratedFile>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      enviar(res, await generate(req, contexto(req)));
    } catch (e) {
      next(e instanceof CaseNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
    }
  };

export const sheet = (providers: Providers) =>
  handler((req, ctx) => documentsService.generateSheet(providers, ctx, req.params.id as string));

export const checklist = (providers: Providers) =>
  handler((req, ctx) => documentsService.generateChecklist(providers, ctx, req.params.id as string));

export const cronograma = (providers: Providers) =>
  handler((_req, ctx) => documentsService.generateSchedule(providers, ctx));

export const finance = (providers: Providers) =>
  handler((req, ctx) => documentsService.generateFinance(providers, ctx, req.query as unknown as FinanceReportQuery));

export const stalled = (providers: Providers) =>
  handler((_req, ctx) => documentsService.generateStalled(providers, ctx));

export const runExport = handler((_req, ctx) => documentsService.exportData(ctx));
