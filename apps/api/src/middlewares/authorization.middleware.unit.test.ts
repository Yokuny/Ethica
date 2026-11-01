import type { Permissoes, Role } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { can, checkRole, isAdmin, isManager, isOperator, platformAdminOnly } from './authorization.middleware.js';

const buildReq = (tenantUser: { role?: Role[]; isPlatformAdmin?: boolean; permissoes?: Permissoes }): Request =>
  ({ tenantUser }) as unknown as Request;

const asStatusError = (next: ReturnType<typeof vi.fn>): { status: number } =>
  next.mock.calls[0][0] as { status: number };

describe('checkRole — matriz papel×rota (FND-08)', () => {
  it.each([
    ['admin' as Role, ['admin'] as Role[], true],
    ['admin' as Role, ['manager'] as Role[], false],
    ['manager' as Role, ['manager'] as Role[], true],
    ['manager' as Role, ['operator'] as Role[], false],
    ['operator' as Role, ['operator'] as Role[], true],
    ['operator' as Role, ['admin'] as Role[], false],
  ])('allowedRoles=[%s], req.tenantUser.role=%s -> permitted=%s', (allowed, role, permitted) => {
    const next = vi.fn();

    checkRole([allowed])(buildReq({ role }), {} as Response, next as unknown as NextFunction);

    if (permitted) {
      expect(next).toHaveBeenCalledWith();
    } else {
      expect(asStatusError(next).status).toBe(403);
    }
  });
});

describe('can — matriz de permissões (AD-137)', () => {
  it.each([
    [{ expert_cases: ['view'] } as Permissoes, true],
    [{ expert_cases: ['view', 'update'] } as Permissoes, true],
    [{ agenda: ['view', 'update'] } as Permissoes, false],
    [{} as Permissoes, false],
  ])('permissoes=%j em pericias.view -> permitted=%s', (permissoes, permitted) => {
    const next = vi.fn();
    can('expert_cases', 'view')(buildReq({ permissoes }), {} as Response, next as unknown as NextFunction);
    if (permitted) expect(next).toHaveBeenCalledWith();
    else expect(asStatusError(next).status).toBe(403);
  });

  it('exige todas as ações pedidas', () => {
    const next = vi.fn();
    can('finance', 'view', 'update')(
      buildReq({ permissoes: { finance: ['view'] } }),
      {} as Response,
      next as unknown as NextFunction,
    );
    expect(asStatusError(next).status).toBe(403);
  });
});

describe('role aliases', () => {
  it('isAdmin allows admin and rejects other roles with 403', () => {
    const nextOk = vi.fn();
    isAdmin(buildReq({ role: ['admin'] }), {} as Response, nextOk as unknown as NextFunction);
    expect(nextOk).toHaveBeenCalledWith();

    const nextReject = vi.fn();
    isAdmin(buildReq({ role: ['manager'] }), {} as Response, nextReject as unknown as NextFunction);
    expect(asStatusError(nextReject).status).toBe(403);
  });

  it('isManager allows manager and rejects other roles with 403', () => {
    const nextOk = vi.fn();
    isManager(buildReq({ role: ['manager'] }), {} as Response, nextOk as unknown as NextFunction);
    expect(nextOk).toHaveBeenCalledWith();

    const nextReject = vi.fn();
    isManager(buildReq({ role: ['operator'] }), {} as Response, nextReject as unknown as NextFunction);
    expect(asStatusError(nextReject).status).toBe(403);
  });

  it('isOperator allows operator and rejects other roles with 403', () => {
    const nextOk = vi.fn();
    isOperator(buildReq({ role: ['operator'] }), {} as Response, nextOk as unknown as NextFunction);
    expect(nextOk).toHaveBeenCalledWith();

    const nextReject = vi.fn();
    isOperator(buildReq({ role: ['admin'] }), {} as Response, nextReject as unknown as NextFunction);
    expect(asStatusError(nextReject).status).toBe(403);
  });
});

describe('platformAdminOnly (FND-01/AC3)', () => {
  it('calls next() when isPlatformAdmin is true', () => {
    const next = vi.fn();

    platformAdminOnly(buildReq({ isPlatformAdmin: true }), {} as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) with 403 — never a bare next() — when isPlatformAdmin is false, which is what stops Express before reaching the controller', () => {
    const next = vi.fn();

    platformAdminOnly(buildReq({ isPlatformAdmin: false }), {} as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(asStatusError(next).status).toBe(403);
  });

  it('calls next(err) with 403 when isPlatformAdmin is absent from req.tenantUser', () => {
    const next = vi.fn();

    platformAdminOnly(buildReq({}), {} as Response, next as unknown as NextFunction);

    expect(asStatusError(next).status).toBe(403);
  });
});
