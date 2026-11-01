import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import { CustomError } from './errorHandler.middleware.js';

type ValidationTarget = 'body' | 'params' | 'query';

// The client only gets the generic `invalid_data` key; the per-field detail
// (`path: Zod message`) goes in `detail`, which only the errorHandler log reads.
// Reused by the query validations done by hand in the routers (workaround for the
// Express 5 `req.query` getter).
export const invalidDataError = (error: ZodError, target: string): CustomError =>
  new CustomError(
    'invalid_data',
    400,
    error.issues.map((issue) => `${issue.path.join('.') || target}: ${issue.message}`).join('; '),
  );

// safeParse (never parse/try-catch): removes the reference bug at the root —
// `next()` called inside a `for` over the errors (Risk: ERR_HTTP_HEADERS_SENT
// with multiple invalid fields). Here there is only ONE way out per
// call, and the read is always `error.issues` (Zod 4), never `error.errors`.
const validate = (schema: ZodType, target: ValidationTarget) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(invalidDataError(result.error, target));
      return;
    }

    // In-place mutation (not reassignment): in Express 5, req.query can be
    // a getter — Object.assign keeps the reference and still applies the
    // schema transformations (e.g. lowercase e-mail).
    if (target === 'body' && req.body === undefined) req.body = {};
    Object.assign(req[target] as object, result.data);
    next();
  };
};

export const validBody = (schema: ZodType) => validate(schema, 'body');
export const validParams = (schema: ZodType) => validate(schema, 'params');
export const validQuery = (schema: ZodType) => validate(schema, 'query');

// MOD-10: in Express 5, req.query is a getter without cache — the Object.assign of
// validQuery is lost before the controller reads it again. Here req.query is
// replaced by a truly writable value: the parse result, with the
// schema coercion and defaults. Replaces the local copies in the routers.
export const validParsedQuery = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(invalidDataError(result.error, 'query'));
      return;
    }
    Object.defineProperty(req, 'query', { value: result.data, configurable: true, enumerable: true, writable: true });
    next();
  };
};
