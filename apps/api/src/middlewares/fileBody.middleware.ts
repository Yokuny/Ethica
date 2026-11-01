import express, { type NextFunction, type Request, type Response } from 'express';
import { CustomError } from './errorHandler.middleware.js';

// File sent as the request body with its own Content-Type (AD-118), without
// multipart. `text/*` arrives as a string; the rest as a Buffer. The body-parser 413 and the
// wrong type become contract keys. Accepts one type or a list (inspection media, AD-129).
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
