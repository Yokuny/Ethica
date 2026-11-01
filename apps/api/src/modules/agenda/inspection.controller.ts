import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import { AppointmentNotFoundError } from './appointment.service.js';
import type { InspectionDayQuery, MediaUploadQuery } from './inspection.schema.js';
import * as inspectionService from './inspection.service.js';
import { InspectionConflictError } from './inspection.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const appointmentId = (req: Request): string => req.params.appointmentId as string;
const mediaId = (req: Request): string => req.params.mediaId as string;

const json =
  (run: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(respObj({ data: await run(req) }));
    } catch (e) {
      // Conflito do offline (AD-128): 409 com a versão do servidor para o aparelho comparar.
      if (e instanceof InspectionConflictError) {
        res.status(409).json({ ...respObj({ data: e.current, message: e.message }), success: false });
        return;
      }
      next(e instanceof AppointmentNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
    }
  };

export const listDay = json((req) =>
  inspectionService.listDay(tenantOf(req), (req.query as unknown as InspectionDayQuery).date),
);
export const listByCase = json((req) => inspectionService.listByCase(tenantOf(req), req.params.caseId as string));
export const getInspection = json((req) => inspectionService.getInspection(tenantOf(req), appointmentId(req)));
export const saveInspection = json((req) =>
  inspectionService.saveInspection(tenantOf(req), appointmentId(req), req.body),
);

export const uploadMedia = (storage: FileStorage | undefined) =>
  json((req) =>
    inspectionService.uploadMedia(
      storage,
      tenantOf(req),
      appointmentId(req),
      mediaId(req),
      req.query as unknown as MediaUploadQuery,
      { body: req.body as Buffer, mime: (req.get('content-type') ?? '').split(';')[0] as string },
    ),
  );

export const updateCaption = json((req) =>
  inspectionService.updateCaption(tenantOf(req), appointmentId(req), mediaId(req), req.body.caption),
);

export const removeMedia = (storage: FileStorage | undefined) =>
  json(async (req) => {
    await inspectionService.removeMedia(storage, tenantOf(req), appointmentId(req), mediaId(req));
  });

// Mídia é imutável (id novo a cada arquivo): o navegador pode guardar à vontade.
export const getMedia =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const media = await inspectionService.getMedia(storage, tenantOf(req), appointmentId(req), mediaId(req));
      res.set('Content-Type', media.mime).set('Cache-Control', 'private, max-age=31536000, immutable').end(media.body);
    } catch (e) {
      next(e);
    }
  };
