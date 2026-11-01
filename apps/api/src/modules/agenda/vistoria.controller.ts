import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import { CompromissoNotFoundError } from './compromisso.service.js';
import type { MidiaUploadQuery, VistoriaDiaQuery } from './vistoria.schema.js';
import * as vistoriaService from './vistoria.service.js';
import { VistoriaConflictError } from './vistoria.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;
const compromissoId = (req: Request): string => req.params.compromissoId as string;
const midiaId = (req: Request): string => req.params.midiaId as string;

const json =
  (run: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(respObj({ data: await run(req) }));
    } catch (e) {
      // Conflito do offline (AD-128): 409 com a versão do servidor para o aparelho comparar.
      if (e instanceof VistoriaConflictError) {
        res.status(409).json({ ...respObj({ data: e.atual, message: e.message }), success: false });
        return;
      }
      next(e instanceof CompromissoNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
    }
  };

export const listDia = json((req) =>
  vistoriaService.listDia(tenantOf(req), (req.query as unknown as VistoriaDiaQuery).date),
);
export const listDaPericia = json((req) =>
  vistoriaService.listDaPericia(tenantOf(req), req.params.periciaId as string),
);
export const getVistoria = json((req) => vistoriaService.getVistoria(tenantOf(req), compromissoId(req)));
export const salvarVistoria = json((req) =>
  vistoriaService.salvarVistoria(tenantOf(req), compromissoId(req), req.body),
);

export const uploadMidia = (storage: FileStorage | undefined) =>
  json((req) =>
    vistoriaService.uploadMidia(
      storage,
      tenantOf(req),
      compromissoId(req),
      midiaId(req),
      req.query as unknown as MidiaUploadQuery,
      { body: req.body as Buffer, mime: (req.get('content-type') ?? '').split(';')[0] as string },
    ),
  );

export const updateLegenda = json((req) =>
  vistoriaService.updateLegenda(tenantOf(req), compromissoId(req), midiaId(req), req.body.legenda),
);

export const removeMidia = (storage: FileStorage | undefined) =>
  json(async (req) => {
    await vistoriaService.removeMidia(storage, tenantOf(req), compromissoId(req), midiaId(req));
  });

// Mídia é imutável (id novo a cada arquivo): o navegador pode guardar à vontade.
export const getMidia =
  (storage: FileStorage | undefined) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const midia = await vistoriaService.getMidia(storage, tenantOf(req), compromissoId(req), midiaId(req));
      res.set('Content-Type', midia.mime).set('Cache-Control', 'private, max-age=31536000, immutable').end(midia.body);
    } catch (e) {
      next(e);
    }
  };
