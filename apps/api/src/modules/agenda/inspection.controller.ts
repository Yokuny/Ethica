import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { FileStorage } from '../../providers/file-storage.js';
import type { InspectionPeriodQuery, MediaUploadQuery } from './inspection.schema.js';
import * as inspectionService from './inspection.service.js';
import { InspectionConflictError } from './inspection.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const appointmentId = (req: Request): string => req.params.appointmentId as string;
const mediaId = (req: Request): string => req.params.mediaId as string;

export const listPeriod = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as InspectionPeriodQuery;
  res.json(respObj({ data: await inspectionService.listPeriod(tenantOf(req), query) }));
};

export const listByCase = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await inspectionService.listByCase(tenantOf(req), req.params.caseId as string) }));
};

export const getInspection = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await inspectionService.getInspection(tenantOf(req), appointmentId(req)) }));
};

// Offline conflict (AD-128): 409 with the server version for the device to compare — the
// only error a controller answers itself (AD-284).
export const saveInspection = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(respObj({ data: await inspectionService.saveInspection(tenantOf(req), appointmentId(req), req.body) }));
  } catch (e) {
    if (!(e instanceof InspectionConflictError)) throw e;
    res.status(409).json({ ...respObj({ data: e.current, message: e.message }), success: false });
  }
};

export const uploadMedia =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const data = await inspectionService.uploadMedia(
      storage,
      tenantOf(req),
      appointmentId(req),
      mediaId(req),
      req.query as unknown as MediaUploadQuery,
      { body: req.body as Buffer, mime: (req.get('content-type') ?? '').split(';')[0] as string },
    );
    res.json(respObj({ data }));
  };

export const updateCaption = async (req: Request, res: Response): Promise<void> => {
  const data = await inspectionService.updateCaption(tenantOf(req), appointmentId(req), mediaId(req), req.body.caption);
  res.json(respObj({ data }));
};

export const removeMedia =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await inspectionService.removeMedia(storage, tenantOf(req), appointmentId(req), mediaId(req));
    res.json(respObj({}));
  };

// Media is immutable (new id for each file): the browser may cache it freely.
export const getMedia =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const media = await inspectionService.getMedia(storage, tenantOf(req), appointmentId(req), mediaId(req));
    res.set('Content-Type', media.mime).set('Cache-Control', 'private, max-age=31536000, immutable').end(media.body);
  };
