import { hasPermission, respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { DocumentContext, GeneratedFile } from './documents.schema.js';
import type {
  AttachReportQuery,
  ImportTemplateQuery,
  ListReportsQuery,
  ListTemplatesQuery,
  ReportPdfQuery,
  ReportRouterDeps,
} from './report.schema.js';
import * as reportService from './report.service.js';
import * as templateService from './template.service.js';

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

const send = (res: Response, file: GeneratedFile): void => {
  res
    .set('Content-Type', file.type)
    .set('Content-Disposition', `attachment; filename="${file.name}"`)
    .set('Cache-Control', 'no-store')
    .end(file.conteudo);
};

const id = (req: Request): string => req.params.id as string;
const sectionId = (req: Request): string => req.params.sectionId as string;
const mediaId = (req: Request): string => req.params.mediaId as string;

// Modelos (LAU-01, LAU-05)
export const listTemplates = async (req: Request, res: Response): Promise<void> => {
  const { type } = req.query as unknown as ListTemplatesQuery;
  res.json(respObj({ data: await templateService.listTemplates(tenantOf(req), type) }));
};

export const getTemplate = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await templateService.getTemplate(tenantOf(req), id(req)) }));
};

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  res
    .status(201)
    .json(
      respObj({ data: await templateService.createTemplate(tenantOf(req), req.body), message: 'created_successfully' }),
    );
};

export const importTemplate = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ImportTemplateQuery;
  res.status(201).json(
    respObj({
      data: await templateService.importTemplate(tenantOf(req), query, req.body as Buffer),
      message: 'created_successfully',
    }),
  );
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await templateService.updateTemplate(tenantOf(req), id(req), req.body) }));
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  await templateService.deleteTemplate(tenantOf(req), id(req));
  res.json(respObj({ message: 'removed_successfully' }));
};

export const addTemplateSection = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(
    respObj({
      data: await templateService.addSection(tenantOf(req), id(req), req.body),
      message: 'created_successfully',
    }),
  );
};

export const updateTemplateSection = async (req: Request, res: Response): Promise<void> => {
  const data = await templateService.updateSection(tenantOf(req), id(req), sectionId(req), req.body);
  res.json(respObj({ data }));
};

export const removeTemplateSection = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await templateService.removeSection(tenantOf(req), id(req), sectionId(req)) }));
};

export const setTemplateLayout = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await templateService.setLayout(tenantOf(req), id(req), req.body) }));
};

export const moveTemplateSection = async (req: Request, res: Response): Promise<void> => {
  const data = await templateService.moveSection(tenantOf(req), id(req), sectionId(req), req.body);
  res.json(respObj({ data }));
};

// Laudos (LAU-02, LAU-03, LAU-06)
export const listReports = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListReportsQuery;
  res.json(respObj({ data: await reportService.listReports(tenantOf(req), query) }));
};

export const getReport = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await reportService.openReport(context(req), id(req)) }));
};

export const createReport =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(
      respObj({
        data: await reportService.createReport(providers, context(req), req.body),
        message: 'created_successfully',
      }),
    );
  };

export const updateReportSection = async (req: Request, res: Response): Promise<void> => {
  const data = await reportService.updateSection(context(req), id(req), sectionId(req), req.body);
  res.json(respObj({ data }));
};

export const saveReportAsTemplate =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(
      respObj({
        data: await reportService.saveAsTemplate(providers, context(req), id(req), req.body),
        message: 'created_successfully',
      }),
    );
  };

export const attachReport =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AttachReportQuery;
    res.status(201).json(
      respObj({
        data: await reportService.attachReport(providers, context(req), query, req.body as Buffer),
        message: 'created_successfully',
      }),
    );
  };

export const moveReportSection = async (req: Request, res: Response): Promise<void> => {
  const data = await reportService.moveSection(context(req), id(req), sectionId(req), req.body);
  res.json(respObj({ data }));
};

export const addReportSection = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(
    respObj({
      data: await reportService.addSection(context(req), id(req), req.body),
      message: 'created_successfully',
    }),
  );
};

export const setReportLayout = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await reportService.setLayout(context(req), id(req), req.body) }));
};

export const chooseReportSections =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    res.json(respObj({ data: await reportService.chooseSections(providers, context(req), id(req), req.body) }));
  };

export const fillReportFromProcess = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await reportService.fillFromProcess(context(req), id(req), req.body as Buffer) }));
};

export const removeReportSection = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await reportService.removeSection(context(req), id(req), sectionId(req)) }));
};

export const completeReport =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    res.json(respObj({ data: await reportService.completeReport(providers, context(req), id(req), req.body) }));
  };

export const deleteReport =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    await reportService.deleteReport(providers, tenantOf(req), id(req));
    res.json(respObj({ message: 'removed_successfully' }));
  };

export const uploadReportMedia =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    const data = await reportService.uploadMedia(providers, tenantOf(req), id(req), mediaId(req), {
      body: req.body as Buffer,
      mime: (req.get('content-type') ?? '').split(';')[0] as string,
    });
    res.json(respObj({ data }));
  };

export const getReportMedia =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    const media = await reportService.getMedia(providers, tenantOf(req), id(req), mediaId(req));
    res.set('Content-Type', media.mime).set('Cache-Control', 'private, max-age=31536000, immutable').end(media.body);
  };

export const reportPdf =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    const preview = (req.query as unknown as ReportPdfQuery).preview === 'true';
    send(res, await reportService.generatePdf(providers, context(req), id(req), { preview }));
  };

export const templatePdf =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await reportService.templatePdf(providers, context(req), id(req)));
  };

export const reportDocx =
  (providers: Providers) =>
  async (req: Request, res: Response): Promise<void> => {
    send(res, await reportService.generateDocx(providers, context(req), id(req)));
  };
