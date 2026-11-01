import { hasPermission, respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { DocumentContext, GeneratedFile } from './documents.schema.js';
import type { ListReportsQuery, ListTemplatesQuery, ReportPdfQuery, ReportRouterDeps } from './report.schema.js';
import * as reportService from './report.service.js';
import { ReportNotFoundError } from './report.service.js';
import * as templateService from './template.service.js';
import { TemplateNotFoundError } from './template.service.js';

type Providers = Pick<ReportRouterDeps, 'pdf' | 'storage'>;

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const context = (req: Request): DocumentContext => {
  return {
    tenantId: tenantOf(req),
    userId: req.tenantUser.user,
    canSeeFinance: hasPermission(req.tenantUser.permissions, 'finance', 'view'),
    now: new Date(),
  };
};

// Report, template or case missing (or from another tenant) → 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof ReportNotFoundError || e instanceof TemplateNotFoundError || e instanceof CaseNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

const json =
  (run: (req: Request) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await run(req);
      res.status(status).json(respObj(status === 201 ? { data, message: 'created_successfully' } : { data }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

const removed =
  (run: (req: Request) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await run(req);
      res.json(respObj({ message: 'removed_successfully' }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

const file =
  (generate: (req: Request) => Promise<GeneratedFile>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const generated = await generate(req);
      res
        .set('Content-Type', generated.type)
        .set('Content-Disposition', `attachment; filename="${generated.name}"`)
        .set('Cache-Control', 'no-store')
        .end(generated.conteudo);
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

const id = (req: Request): string => req.params.id as string;
const sectionId = (req: Request): string => req.params.sectionId as string;

// Modelos (LAU-01, LAU-05)
export const listTemplates = json((req) =>
  templateService.listTemplates(tenantOf(req), (req.query as unknown as ListTemplatesQuery).type),
);
export const getTemplate = json((req) => templateService.getTemplate(tenantOf(req), id(req)));
export const createTemplate = json((req) => templateService.createTemplate(tenantOf(req), req.body), 201);
export const renameTemplate = json((req) => templateService.renameTemplate(tenantOf(req), id(req), req.body.name));
export const deleteTemplate = removed((req) => templateService.deleteTemplate(tenantOf(req), id(req)));
export const addTemplateSection = json((req) => templateService.addSection(tenantOf(req), id(req), req.body), 201);
export const updateTemplateSection = json((req) =>
  templateService.updateSection(tenantOf(req), id(req), sectionId(req), req.body),
);
export const removeTemplateSection = json((req) =>
  templateService.removeSection(tenantOf(req), id(req), sectionId(req)),
);
export const moveTemplateSection = json((req) =>
  templateService.moveSection(tenantOf(req), id(req), sectionId(req), req.body),
);

// Laudos (LAU-02, LAU-03, LAU-06)
export const listReports = json((req) =>
  reportService.listReports(tenantOf(req), req.query as unknown as ListReportsQuery),
);
export const getReport = json((req) => reportService.openReport(context(req), id(req)));
export const createReport = (providers: Providers) =>
  json((req) => reportService.createReport(providers, context(req), req.body), 201);
export const updateReportSection = json((req) =>
  reportService.updateSection(context(req), id(req), sectionId(req), req.body),
);
export const chooseReportSections = (providers: Providers) =>
  json((req) => reportService.chooseSections(providers, context(req), id(req), req.body));
export const removeReportSection = json((req) => reportService.removeSection(context(req), id(req), sectionId(req)));
export const completeReport = (providers: Providers) =>
  json((req) => reportService.completeReport(providers, context(req), id(req), req.body));
export const deleteReport = removed((req) => reportService.deleteReport(tenantOf(req), id(req)));
export const reportPdf = (providers: Providers) =>
  file((req) =>
    reportService.generatePdf(providers, context(req), id(req), {
      preview: (req.query as unknown as ReportPdfQuery).preview === 'true',
    }),
  );
export const reportDocx = (providers: Providers) =>
  file((req) => reportService.generateDocx(providers, context(req), id(req)));
