import crypto from 'node:crypto';
import { type ApiMessageKey, badRespObj, isApiMessageKey } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';

// Base of every error that reaches the client: `message` is ALWAYS a translation
// key of the contract (`@ethica/contracts`, response/messages.ts), never ready-made
// text — the front-end translates. The technical text (invalid field, id,
// operator name) goes in `detail`, which only shows up in the structured log.
export class KeyedError extends Error {
  declare message: ApiMessageKey;
  readonly detail?: string;

  constructor(message: ApiMessageKey, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

// Typed error with an HTTP status — used by the whole middleware chain
// (validation, authentication, authorization, rate limit) to signal the right
// response code without coupling each of them to this file.
export class CustomError extends KeyedError {
  status: number;

  constructor(message: ApiMessageKey, status: number, detail?: string) {
    super(message, detail);
    this.status = status;
  }
}

const hasStatus = (err: unknown): err is { status: number } =>
  typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number';

// Global Express error handler: never exposes the stack or raw text in the response
// body — only in the structured log, with a requestId for correlation. The body
// always carries a contract key: the error's own key when it already is one
// (CustomError/KeyedError), `invalid_data` for a third-party 4xx without a key
// (e.g. malformed JSON from express.json) and `internal_error` for any 5xx.
const resolveMessageKey = (err: unknown, status: number): ApiMessageKey => {
  // 503 with a contract key (e.g. `search_unavailable`, Atlas Search missing)
  // is an unavailability the client should see as such, not a bug.
  if (status === 503 && err instanceof KeyedError) return err.message;
  if (status >= 500) return 'internal_error';
  if (err instanceof Error && isApiMessageKey(err.message)) return err.message;
  return 'invalid_data';
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const status = hasStatus(err) ? err.status : 500;
  const message = resolveMessageKey(err, status);
  const requestId = (req.headers?.['x-request-id'] as string | undefined) ?? crypto.randomUUID();

  console.error(
    JSON.stringify({
      event: 'request.error',
      requestId,
      status,
      message: err instanceof Error ? err.message : String(err),
      detail: err instanceof KeyedError ? err.detail : undefined,
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  res.status(status).json(badRespObj({ message }));
};
