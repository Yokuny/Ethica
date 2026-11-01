import express, { type NextFunction, type Request, type Response } from 'express';
import { CustomError } from './errorHandler.middleware.js';

// Arquivo enviado como corpo da requisição com o próprio Content-Type (AD-118), sem
// multipart. `text/*` chega como string; o resto como Buffer. O 413 do body-parser e o
// tipo errado viram chaves do contrato. Aceita um tipo ou uma lista (mídia da vistoria, AD-129).
export const fileBody = (type: string | string[], limit: number) => {
  const parse =
    typeof type === 'string' && type.startsWith('text/') ? express.text({ type, limit }) : express.raw({ type, limit });
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.is(typeof type === 'string' ? [type] : type)) {
      next(new CustomError('unsupported_file_type', 415, req.get('content-type')));
      return;
    }
    parse(req, res, (error?: unknown) => {
      if ((error as { type?: string } | undefined)?.type === 'entity.too.large') {
        next(new CustomError('file_too_large', 413));
        return;
      }
      next(error);
    });
  };
};
