import { hasPermission, respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import { CustomError } from '../../middlewares/error-handler.middleware.js';
import type { FileStorage } from '../../providers/file-storage.js';
import type { AttachmentUploadQuery, ListCasesQuery } from './case.schema.js';
import * as caseService from './case.service.js';
import type { CsvImportQuery } from './import.schema.js';
import * as importService from './import.service.js';

// The Tenant always comes from req.tenantUser (AD-010), never from the body/query.
const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

// The fees are finance data (AD-285): without `finance:view` they leave the response, and writing them
// (or the payment at registration, AD-176) launches a finance entry, so it needs the finance action.
const canFinance = (req: Request, action: 'view' | 'create' | 'update'): boolean =>
  hasPermission(req.tenantUser.permissions, 'finance', action);
const withoutFees = <T extends { proposedFeesCents?: number; fixedFeesCents?: number }>(req: Request, record: T): T => {
  if (canFinance(req, 'view')) return record;
  const { proposedFeesCents: _proposed, fixedFeesCents: _fixed, ...rest } = record;
  return rest as T;
};
const requireFinanceForFees = (req: Request, action: 'create' | 'update'): void => {
  const writesFees = 'proposedFeesCents' in req.body || 'fixedFeesCents' in req.body || 'payment' in req.body;
  if (writesFees && !canFinance(req, action)) throw new CustomError('no_permission', 403);
};

export const createCase = async (req: Request, res: Response): Promise<void> => {
  requireFinanceForFees(req, 'create');
  const result = await caseService.createCase({ ...req.body, tenant: tenantOf(req) });
  res.status(201).json(respObj({ data: withoutFees(req, result), message: 'created_successfully' }));
};

export const listCases = async (req: Request, res: Response): Promise<void> => {
  const result = await caseService.listCases(tenantOf(req), req.query as unknown as ListCasesQuery);
  res.json(respObj({ data: { ...result, items: result.items.map((item) => withoutFees(req, item)) } }));
};

export const getCase = async (req: Request, res: Response): Promise<void> => {
  const result = await caseService.getCase(tenantOf(req), req.params.id as string);
  res.json(respObj({ data: withoutFees(req, result) }));
};

export const updateCase = async (req: Request, res: Response): Promise<void> => {
  requireFinanceForFees(req, 'update');
  const result = await caseService.updateCase(tenantOf(req), req.params.id as string, req.body);
  res.json(respObj({ data: withoutFees(req, result) }));
};

export const addAttachment =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const { name } = req.query as unknown as AttachmentUploadQuery;
    const mime = req.get('content-type')?.split(';')[0] ?? '';
    const result = await caseService.addAttachment(
      storage,
      tenantOf(req),
      req.params.id as string,
      name,
      mime,
      req.body as Buffer,
    );
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  };

// Always a download (SPA-04): an uploaded HTML never runs on the API domain.
export const getAttachment =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const { body, name, mime } = await caseService.getAttachment(
      storage,
      tenantOf(req),
      req.params.id as string,
      req.params.attachmentId as string,
    );
    res.attachment(name).type(mime).set('X-Content-Type-Options', 'nosniff').end(body);
  };

export const deleteAttachment =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await caseService.deleteAttachment(
      storage,
      tenantOf(req),
      req.params.id as string,
      req.params.attachmentId as string,
    );
    res.json(respObj({ message: 'removed_successfully' }));
  };

export const deleteCase =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await caseService.deleteCase(tenantOf(req), req.params.id as string, storage);
    res.json(respObj({ message: 'removed_successfully' }));
  };

export const caseStats = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.caseStats(tenantOf(req)) }));
};

export const getServiceOrder = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.getServiceOrder(tenantOf(req)) }));
};

export const serviceOrderPreview = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.serviceOrderPreview(tenantOf(req)) }));
};

export const setServiceOrder = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.setServiceOrder(tenantOf(req), req.body) }));
};

export const caseDashboard = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.caseDashboard(tenantOf(req)) }));
};

export const caseDistribution = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.caseDistribution(tenantOf(req)) }));
};

// Home "Stalled cases" block (GES-05).
export const stalledSummary = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await caseService.stalledSummary(tenantOf(req)) }));
};

// Import (AD-114, AD-118): the file arrives as the body through the router's `fileBody`.
export const importPdf = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await importService.extractPdf(tenantOf(req), req.body) }));
};

export const csvColumns = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: importService.csvColumns(req.body) }));
};

export const importCsv = async (req: Request, res: Response): Promise<void> => {
  const { fields } = req.query as CsvImportQuery;
  res.json(respObj({ data: await importService.importCsv(tenantOf(req), req.body, fields) }));
};

export const addMovement = async (req: Request, res: Response): Promise<void> => {
  const data = await caseService.addMovement(tenantOf(req), req.params.id as string, req.body);
  res.status(201).json(respObj({ data: withoutFees(req, data), message: 'created_successfully' }));
};

export const removeMovement = async (req: Request, res: Response): Promise<void> => {
  const data = await caseService.removeMovement(
    tenantOf(req),
    req.params.id as string,
    req.params.movementId as string,
  );
  res.json(respObj({ data: withoutFees(req, data), message: 'removed_successfully' }));
};
