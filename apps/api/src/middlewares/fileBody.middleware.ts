import express, { type NextFunction, type Request, type Response } from 'express';
import { CustomError } from './errorHandler.middleware.js';

// Arquivo enviado como corpo da requisição com o próprio Content-Type (AD-118), sem
// multipart. `text/*` chega como string; o resto como Buffer. O 413 do body-parser e o
// tipo errado viram chaves do contrato.
export const fileBody = (type: string, limit: number) => {
  const parse = type.startsWith('text/') ? express.text({ type, limit }) : express.raw({ type, limit });
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.is(type)) {
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
