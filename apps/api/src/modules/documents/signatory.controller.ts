import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import * as signatoryService from './signatory.service.js';
import { SignatoryNotFoundError } from './signatory.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const id = (req: Request): string => req.params.id as string;

const json =
  (run: (req: Request) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await run(req);
      res.status(status).json(respObj(status === 201 ? { data, message: 'created_successfully' } : { data }));
    } catch (e) {
      next(e instanceof SignatoryNotFoundError ? new CustomError(e.message, 404) : e);
    }
  };

// Technical responsible (NLA-02); the logo answers with the updated record.
export const listSignatories = json((req) => signatoryService.listSignatories(tenantOf(req)));
export const createSignatory = json((req) => signatoryService.createSignatory(tenantOf(req), req.body), 201);
export const updateSignatory = json((req) => signatoryService.updateSignatory(tenantOf(req), id(req), req.body));
export const deleteSignatory = (storage: FileStorage | undefined) =>
  json(async (req) => {
    await signatoryService.deleteSignatory(storage, tenantOf(req), id(req));
    return null;
  });
export const setSignatoryLogo = (storage: FileStorage | undefined) =>
  json(async (req) => {
    await signatoryService.setLogo(storage, tenantOf(req), id(req), req.body as Buffer);
    return null;
  });
export const removeSignatoryLogo = (storage: FileStorage | undefined) =>
  json(async (req) => {
    await signatoryService.removeLogo(storage, tenantOf(req), id(req));
    return null;
  });

// The path is versioned (?v=): the browser may cache the image.
export const getSignatoryLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bytes = await signatoryService.getLogo(storage, tenantOf(req), id(req));
      res.set('Content-Type', 'image/png').set('Cache-Control', 'private, max-age=31536000, immutable').end(bytes);
    } catch (e) {
      next(e instanceof SignatoryNotFoundError ? new CustomError(e.message, 404) : e);
    }
  };
