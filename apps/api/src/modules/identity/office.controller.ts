import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { UpdateOffice, UpdateRevenueGoal } from './office.schema.js';
import * as officeService from './office.service.js';

export const getOffice = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await officeService.getOffice(req.tenantUser.tenant as string) }));
};

export const updateOffice = async (req: Request, res: Response): Promise<void> => {
  const data = await officeService.updateOffice(req.tenantUser.tenant as string, req.body as UpdateOffice);
  res.json(respObj({ data }));
};

export const setLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const data = await officeService.setLogo(storage, req.tenantUser.tenant as string, req.body as Buffer);
    res.json(respObj({ data }));
  };

export const removeLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    res.json(respObj({ data: await officeService.removeLogo(storage, req.tenantUser.tenant as string) }));
  };

// The path is versioned (?v=): the browser may cache the image.
export const getLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const bytes = await officeService.getLogo(storage, req.tenantUser.tenant as string);
    res.set('Content-Type', 'image/png').set('Cache-Control', 'private, max-age=31536000, immutable').end(bytes);
  };

export const getScheduleNotice = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await officeService.getScheduleNotice(req.tenantUser.tenant as string) }));
};

export const updateScheduleNotice = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await officeService.updateScheduleNotice(req.tenantUser.tenant as string, req.body) }));
};

export const updateRevenueGoal = async (req: Request, res: Response): Promise<void> => {
  const data = await officeService.setRevenueGoal(req.tenantUser.tenant as string, req.body as UpdateRevenueGoal);
  res.json(respObj({ data }));
};
