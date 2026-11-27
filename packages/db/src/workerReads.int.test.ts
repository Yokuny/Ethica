import type mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestDb } from '../tests/helpers/db.helper.js';
import { Case } from './models/case.model.js';
import { Tenant } from './models/tenant.model.js';
import { listTrackedCases } from './workerReads.js';

const now = new Date('2026-11-24T09:00:00.000Z');

describe('listTrackedCases (PAC-03)', () => {
  useTestDb();

  const seedTenant = (document: string, automation: boolean) =>
    Tenant.create({
      name: `Escritório ${document}`,
      document,
      status: 'active',
      ...(automation ? { automationUntil: new Date('2027-01-01T03:00:00.000Z') } : {}),
    });
  const seedCase = (tenant: { _id: mongoose.Types.ObjectId }, processNumber: string, extra: object = {}) =>
    Case.create({
      Tenant: tenant._id,
      processNumber,
      courtType: 'labor',
      role: 'court_expert',
      subject: 'Insalubridade',
      ...extra,
    });

  it('a mesma regra para o worker (todos os escritórios) e para a página (um escritório)', async () => {
    const office = await seedTenant('11222333000181', true);
    const other = await seedTenant('11444777000161', true);
    const withoutModule = await seedTenant('22333444000105', false);
    const tracked = await seedCase(office, '0017068-93.2025.5.16.0008');
    await seedCase(office, '0000002-00.2026.8.26.0100', { courtType: 'civil' });
    await seedCase(office, '0000003-00.2026.5.16.0001', { phase: 'settlement' });
    await seedCase(office, '0000004-00.2026.5.16.0001', { status: 'canceled' });
    const otherTracked = await seedCase(other, '0024364-65.2020.5.24.0091');
    await seedCase(withoutModule, '0000005-00.2026.5.16.0001');

    const all = await listTrackedCases(now);
    expect(all.map((item) => item.caseId).sort()).toEqual([tracked.id, otherTracked.id].sort());

    const mine = await listTrackedCases(now, office.id);
    expect(mine).toEqual([
      expect.objectContaining({
        tenantId: office.id,
        caseId: tracked.id,
        processNumber: '0017068-93.2025.5.16.0008',
        court: 'TRT16',
      }),
    ]);
    expect(all.filter((item) => item.tenantId === office.id)).toEqual(mine);
    expect(await listTrackedCases(now, withoutModule.id)).toEqual([]);
  });
});
