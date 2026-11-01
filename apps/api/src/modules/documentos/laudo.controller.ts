import { pode, respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { CaseNotFoundError } from '../case/case.service.js';
import type { DocumentoContexto, GeneratedFile } from './documentos.schema.js';
import type { LaudoRouterDeps, ListLaudosQuery, ListModelosQuery } from './laudo.schema.js';
import * as laudoService from './laudo.service.js';
import { LaudoNotFoundError } from './laudo.service.js';
import * as modeloLaudoService from './modeloLaudo.service.js';
import { ModeloLaudoNotFoundError } from './modeloLaudo.service.js';

type Providers = Pick<LaudoRouterDeps, 'pdf' | 'storage'>;

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const contexto = (req: Request): DocumentoContexto => {
  return {
    tenantId: tenantOf(req),
    userId: req.tenantUser.user,
    canSeeFinance: pode(req.tenantUser.permissoes, 'finance', 'view'),
    now: new Date(),
  };
};

// Laudo, modelo ou perícia inexistentes (ou de outro tenant) → 404.
const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(
    e instanceof LaudoNotFoundError || e instanceof ModeloLaudoNotFoundError || e instanceof CaseNotFoundError
      ? new CustomError(e.message, 404, e.detail)
      : e,
  );
};

const json =
  (run: (req: Request) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await run(req);
      res.status(status).json(respObj(status === 201 ? { data, message: 'created_successfully' } : { data }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

const removido =
  (run: (req: Request) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await run(req);
      res.json(respObj({ message: 'removed_successfully' }));
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

const arquivo =
  (gerar: (req: Request) => Promise<GeneratedFile>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const generated = await gerar(req);
      res
        .set('Content-Type', generated.tipo)
        .set('Content-Disposition', `attachment; filename="${generated.nome}"`)
        .set('Cache-Control', 'no-store')
        .end(generated.conteudo);
    } catch (e) {
      notFoundAs404(e, next);
    }
  };

const id = (req: Request): string => req.params.id as string;
const secaoId = (req: Request): string => req.params.secaoId as string;

// Modelos (LAU-01, LAU-05)
export const listModelos = json((req) =>
  modeloLaudoService.listModelos(tenantOf(req), (req.query as unknown as ListModelosQuery).tipo),
);
export const getModelo = json((req) => modeloLaudoService.getModelo(tenantOf(req), id(req)));
export const createModelo = json((req) => modeloLaudoService.createModelo(tenantOf(req), req.body), 201);
export const renameModelo = json((req) => modeloLaudoService.renameModelo(tenantOf(req), id(req), req.body.nome));
export const deleteModelo = removido((req) => modeloLaudoService.deleteModelo(tenantOf(req), id(req)));
export const addModeloSecao = json((req) => modeloLaudoService.addSecao(tenantOf(req), id(req), req.body), 201);
export const updateModeloSecao = json((req) =>
  modeloLaudoService.updateSecao(tenantOf(req), id(req), secaoId(req), req.body),
);
export const removeModeloSecao = json((req) => modeloLaudoService.removeSecao(tenantOf(req), id(req), secaoId(req)));
export const moverModeloSecao = json((req) =>
  modeloLaudoService.moverSecao(tenantOf(req), id(req), secaoId(req), req.body),
);

// Laudos (LAU-02, LAU-03, LAU-06)
export const listLaudos = json((req) =>
  laudoService.listLaudos(tenantOf(req), req.query as unknown as ListLaudosQuery),
);
export const getLaudo = json((req) => laudoService.abrirLaudo(contexto(req), id(req)));
export const createLaudo = (providers: Providers) =>
  json((req) => laudoService.createLaudo(providers, contexto(req), req.body), 201);
export const updateLaudoSecao = json((req) => laudoService.updateSecao(contexto(req), id(req), secaoId(req), req.body));
export const removeLaudoSecao = json((req) => laudoService.removeSecao(contexto(req), id(req), secaoId(req)));
export const concluirLaudo = (providers: Providers) =>
  json((req) => laudoService.concluirLaudo(providers, contexto(req), id(req), req.body));
export const deleteLaudo = removido((req) => laudoService.deleteLaudo(tenantOf(req), id(req)));
export const laudoPdf = (providers: Providers) =>
  arquivo((req) => laudoService.gerarPdf(providers, contexto(req), id(req)));
export const laudoDocx = (providers: Providers) =>
  arquivo((req) => laudoService.gerarDocx(providers, contexto(req), id(req)));
