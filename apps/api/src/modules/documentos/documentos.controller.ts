import { pode } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { PericiaNotFoundError } from '../pericia/pericia.service.js';
import type {
  ArquivoGerado,
  DocumentoContexto,
  DocumentosRouterDeps,
  FinanceiroReportQuery,
} from './documentos.schema.js';
import * as documentosService from './documentos.service.js';

type Providers = Pick<DocumentosRouterDeps, 'pdf' | 'storage'>;

const contexto = (req: Request): DocumentoContexto => {
  return {
    tenantId: req.tenantUser.tenant as string,
    userId: req.tenantUser.user,
    canSeeFinance: pode(req.tenantUser.permissoes, 'finance', 'view'),
    now: new Date(),
  };
};

const enviar = (res: Response, arquivo: ArquivoGerado): void => {
  res
    .set('Content-Type', arquivo.tipo)
    .set('Content-Disposition', `attachment; filename="${arquivo.nome}"`)
    .set('Cache-Control', 'no-store')
    .end(arquivo.conteudo);
};

// Um handler por documento: gera e devolve o arquivo; perícia de outro tenant é 404.
const handler =
  (gerar: (req: Request, ctx: DocumentoContexto) => Promise<ArquivoGerado>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      enviar(res, await gerar(req, contexto(req)));
    } catch (e) {
      next(e instanceof PericiaNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
    }
  };

export const ficha = (providers: Providers) =>
  handler((req, ctx) => documentosService.gerarFicha(providers, ctx, req.params.id as string));

export const checklist = (providers: Providers) =>
  handler((req, ctx) => documentosService.gerarChecklist(providers, ctx, req.params.id as string));

export const cronograma = (providers: Providers) =>
  handler((_req, ctx) => documentosService.gerarCronograma(providers, ctx));

export const financeiro = (providers: Providers) =>
  handler((req, ctx) =>
    documentosService.gerarFinanceiro(providers, ctx, req.query as unknown as FinanceiroReportQuery),
  );

export const paradas = (providers: Providers) => handler((_req, ctx) => documentosService.gerarParadas(providers, ctx));

export const exportar = handler((_req, ctx) => documentosService.exportarDados(ctx));
