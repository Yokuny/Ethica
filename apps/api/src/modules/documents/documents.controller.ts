import { hasPermission } from '@ethica/contracts';
import type { Request, Response } from 'express';
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

// One handler per document: generates and returns the file.
export const sheet =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await documentsService.generateSheet(providers, context(req), req.params.id as string));
  };

export const checklist =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await documentsService.generateChecklist(providers, context(req), req.params.id as string));
  };

export const inspection =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await documentsService.generateInspection(providers, context(req), req.params.appointmentId as string));
  };

export const schedule =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await documentsService.generateSchedule(providers, context(req)));
  };

export const finance =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as FinanceReportQuery;
    send(res, await documentsService.generateFinance(providers, context(req), query));
  };

export const stalled =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await documentsService.generateStalled(providers, context(req)));
  };

export const runExport = async (req: Request, res: Response): Promise<void> => {
  send(res, await documentsService.exportData(context(req)));
};
