import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { UpdateOffice } from './office.schema.js';
import * as officeService from './office.service.js';

export const getOffice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await officeService.getOffice(req.tenantUser.tenant as string) }));
  } catch (e) {
    next(e);
  }
};

export const updateOffice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await officeService.updateOffice(req.tenantUser.tenant as string, req.body as UpdateOffice);
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};

export const setLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await officeService.setLogo(storage, req.tenantUser.tenant as string, req.body as Buffer);
      res.json(respObj({ data }));
    } catch (e) {
      next(e);
    }
  };

export const removeLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(respObj({ data: await officeService.removeLogo(storage, req.tenantUser.tenant as string) }));
    } catch (e) {
      next(e);
    }
  };

// O caminho é versionado (?v=): o navegador pode guardar a imagem.
export const getLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bytes = await officeService.getLogo(storage, req.tenantUser.tenant as string);
      res.set('Content-Type', 'image/png').set('Cache-Control', 'private, max-age=31536000, immutable').end(bytes);
    } catch (e) {
      next(e);
    }
  };
