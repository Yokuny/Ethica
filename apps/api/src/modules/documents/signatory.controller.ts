import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { FileStorage } from '../../providers/file-storage.js';
import * as signatoryService from './signatory.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const id = (req: Request): string => req.params.id as string;

// Technical responsible (NLA-02).
export const listSignatories = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await signatoryService.listSignatories(tenantOf(req)) }));
};

export const createSignatory = async (req: Request, res: Response): Promise<void> => {
  const data = await signatoryService.createSignatory(tenantOf(req), req.body);
  res.status(201).json(respObj({ data, message: 'created_successfully' }));
};

export const updateSignatory = async (req: Request, res: Response): Promise<void> => {
  res.json(respObj({ data: await signatoryService.updateSignatory(tenantOf(req), id(req), req.body) }));
};

export const deleteSignatory =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await signatoryService.deleteSignatory(storage, tenantOf(req), id(req));
    res.json(respObj({ data: null }));
  };

export const setSignatoryLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await signatoryService.setLogo(storage, tenantOf(req), id(req), req.body as Buffer);
    res.json(respObj({ data: null }));
  };

export const removeSignatoryLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    await signatoryService.removeLogo(storage, tenantOf(req), id(req));
    res.json(respObj({ data: null }));
  };

// The path is versioned (?v=): the browser may cache the image.
export const getSignatoryLogo =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response): Promise<void> => {
    const bytes = await signatoryService.getLogo(storage, tenantOf(req), id(req));
    res.set('Content-Type', 'image/png').set('Cache-Control', 'private, max-age=31536000, immutable').end(bytes);
  };
