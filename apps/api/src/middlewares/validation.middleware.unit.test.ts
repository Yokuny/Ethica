import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CustomError } from './errorHandler.middleware.js';
import { validBody, validParams, validParsedQuery, validQuery } from './validation.middleware.js';

const testSchema = z
  .object({
    name: z.string().min(3, 'nome deve ter no mínimo 3 caracteres'),
    age: z.number().min(0, 'idade não pode ser negativa'),
  })
  .strict();

const buildReq = (target: 'body' | 'params' | 'query', value: unknown): Request =>
  ({ [target]: value }) as unknown as Request;

describe('validBody', () => {
  it('calls next exactly once with a single aggregated 400 error when 2 fields are invalid', () => {
    const req = buildReq('body', { name: 'a', age: -1 });
    const next = vi.fn() as unknown as NextFunction;

    validBody(testSchema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as CustomError;
    expect(err).toBeInstanceOf(CustomError);
    expect(err.status).toBe(400);
    expect(err.message).toBe('invalid_data');
    expect(err.detail).toContain('name');
    expect(err.detail).toContain('age');
  });

  it('calls next with no arguments when the body matches the schema', () => {
    const req = buildReq('body', { name: 'Fulano', age: 30 });
    const next = vi.fn() as unknown as NextFunction;

    validBody(testSchema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([]);
  });
});

describe('validParams', () => {
  it('calls next with no arguments when params match the schema', () => {
    const req = buildReq('params', { name: 'Fulano', age: 30 });
    const next = vi.fn() as unknown as NextFunction;

    validParams(testSchema)(req, {} as Response, next);

    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([]);
  });
});

describe('validQuery', () => {
  it('calls next with no arguments when query matches the schema', () => {
    const req = buildReq('query', { name: 'Fulano', age: 30 });
    const next = vi.fn() as unknown as NextFunction;

    validQuery(testSchema)(req, {} as Response, next);

    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([]);
  });
});

describe('validParsedQuery', () => {
  const listQuerySchema = z
    .object({
      page: z.coerce.number().int().min(1),
      limit: z.coerce.number().int().default(20),
    })
    .strict();

  // Express 5: req.query is a getter without cache — each read returns a
  // new object, so an in-place mutation would not survive.
  const buildExpress5Req = (rawQuery: Record<string, string>): Request =>
    Object.create({
      get query() {
        return { ...rawQuery };
      },
    }) as Request;

  it('calls next with a 400 invalid_data error located at query when the query is invalid', () => {
    const req = buildExpress5Req({ page: '1', extra: 'x' });
    const next = vi.fn() as unknown as NextFunction;

    validParsedQuery(listQuerySchema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as CustomError;
    expect(err).toBeInstanceOf(CustomError);
    expect(err.status).toBe(400);
    expect(err.message).toBe('invalid_data');
    expect(err.detail).toMatch(/^query: /);
  });

  it('replaces req.query with the parsed value (coerced, with defaults) as a writable property', () => {
    const req = buildExpress5Req({ page: '2' });
    const next = vi.fn() as unknown as NextFunction;

    validParsedQuery(listQuerySchema)(req, {} as Response, next);

    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([]);
    expect(req.query).toEqual({ page: 2, limit: 20 });
    expect(Object.getOwnPropertyDescriptor(req, 'query')?.writable).toBe(true);
  });
});
