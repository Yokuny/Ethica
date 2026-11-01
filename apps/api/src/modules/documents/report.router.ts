import { Router } from 'express';
import { can } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as reportController from './report.controller.js';
import {
  chooseReportSectionsSchema,
  completeReportSchema,
  createReportSchema,
  createTemplateSchema,
  listReportsQuerySchema,
  listTemplatesQuerySchema,
  moveSectionSchema,
  type ReportRouterDeps,
  reportIdParamSchema,
  reportPdfQuerySchema,
  reportSectionParamSchema,
  templateIdParamSchema,
  templateSectionParamSchema,
  templateSectionSchema,
  updateReportSectionSchema,
  updateTemplateSchema,
} from './report.schema.js';

// A template is an office default: only admin and manager edit it (AD-126).

// Reports and templates (LAU-01..03, 05, 06). Mounted on `/expert-reports`; `/templates` comes before `/:id`.
export const createReportRouter = (deps: ReportRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];
  const providers = { pdf: deps.pdf, storage: deps.storage };
  const template = validParams(templateIdParamSchema);
  const templateSection = validParams(templateSectionParamSchema);
  const report = validParams(reportIdParamSchema);
  const reportSection = validParams(reportSectionParamSchema);

  router.get(
    '/templates',
    ...guard,
    can('report_templates', 'view'),
    validParsedQuery(listTemplatesQuerySchema),
    reportController.listTemplates,
  );
  router.post(
    '/templates',
    ...guard,
    can('report_templates', 'create'),
    validBody(createTemplateSchema),
    reportController.createTemplate,
  );
  router.get('/templates/:id', ...guard, can('report_templates', 'view'), template, reportController.getTemplate);
  router.patch(
    '/templates/:id',
    ...guard,
    can('report_templates', 'update'),
    template,
    validBody(updateTemplateSchema),
    reportController.renameTemplate,
  );
  router.delete(
    '/templates/:id',
    ...guard,
    can('report_templates', 'delete'),
    template,
    reportController.deleteTemplate,
  );
  router.post(
    '/templates/:id/sections',
    ...guard,
    can('report_templates', 'update'),
    template,
    validBody(templateSectionSchema),
    reportController.addTemplateSection,
  );
  router.put(
    '/templates/:id/sections/:sectionId',
    ...guard,
    can('report_templates', 'update'),
    templateSection,
    validBody(templateSectionSchema),
    reportController.updateTemplateSection,
  );
  router.delete(
    '/templates/:id/sections/:sectionId',
    ...guard,
    can('report_templates', 'update'),
    templateSection,
    reportController.removeTemplateSection,
  );
  router.post(
    '/templates/:id/sections/:sectionId/move',
    ...guard,
    can('report_templates', 'update'),
    templateSection,
    validBody(moveSectionSchema),
    reportController.moveTemplateSection,
  );

  router.get(
    '/',
    ...guard,
    can('expert_reports', 'view'),
    validParsedQuery(listReportsQuerySchema),
    reportController.listReports,
  );
  router.post(
    '/',
    ...guard,
    can('expert_reports', 'create'),
    validBody(createReportSchema),
    reportController.createReport(providers),
  );
  router.get('/:id', ...guard, can('expert_reports', 'view'), report, reportController.getReport);
  router.delete('/:id', ...guard, can('expert_reports', 'delete'), report, reportController.deleteReport);
  router.put(
    '/:id/sections',
    ...guard,
    can('expert_reports', 'update'),
    report,
    validBody(chooseReportSectionsSchema),
    reportController.chooseReportSections(providers),
  );
  router.patch(
    '/:id/sections/:sectionId',
    ...guard,
    can('expert_reports', 'update'),
    reportSection,
    validBody(updateReportSectionSchema),
    reportController.updateReportSection,
  );
  router.delete(
    '/:id/sections/:sectionId',
    ...guard,
    can('expert_reports', 'update'),
    reportSection,
    reportController.removeReportSection,
  );
  router.post(
    '/:id/complete',
    ...guard,
    can('expert_reports', 'update'),
    report,
    validBody(completeReportSchema),
    reportController.completeReport(providers),
  );
  router.get(
    '/:id/pdf',
    ...guard,
    can('expert_reports', 'view'),
    report,
    validParsedQuery(reportPdfQuerySchema),
    reportController.reportPdf(providers),
  );
  router.get('/:id/docx', ...guard, can('expert_reports', 'view'), report, reportController.reportDocx(providers));
  return router;
};
