import {
  Case,
  CaseCourtSync,
  CourtProcess,
  connect,
  disconnect,
  Notification,
  syncWorkerIndexes,
  Tenant,
  WorkerJob,
} from '@ethica/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CourtProcessData, DatajudClient } from '../datajud/client.js';
import { enqueueCourtRefresh, refreshCourtBatch } from './court-refresh.js';

const now = new Date('2026-11-22T09:00:00.000Z');
const NUMBER = '0024364-65.2020.5.24.0091';

const movement = (key: string, at: string) => ({ key, code: 60, name: 'Expedição de documento', at, complements: [] });
const courtProcess = (movements: CourtProcessData['movements']): CourtProcessData => ({
  court: 'TRT24',
  processNumber: NUMBER,
  degree: 'G1',
  className: 'Ação Trabalhista',
  movements,
});

describe('acompanhamento no tribunal (ADT-02)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
    await syncWorkerIndexes();
    await Notification.createIndexes();
  });
  afterEach(async () => {
    await Promise.all(
      [Case, CaseCourtSync, CourtProcess, Notification, Tenant, WorkerJob].map((model) =>
        (model as typeof Tenant).deleteMany({}),
      ),
    );
  });
  afterAll(async () => {
    await disconnect();
  });

  const seed = async (document: string, automation: boolean, processNumber = NUMBER) => {
    const tenant = await Tenant.create({
      name: `Escritório ${document}`,
      document,
      status: 'active',
      ...(automation ? { automationUntil: new Date('2027-01-01T03:00:00.000Z') } : {}),
    });
    const legalCase = await Case.create({
      Tenant: tenant._id,
      processNumber,
      courtType: 'labor',
      role: 'court_expert',
      court: 'TRT24',
      subject: 'Insalubridade',
    });
    return { tenant, legalCase };
  };

  it('só os serviços de escritório com o módulo entram no lote, por tribunal; TJ fica de fora por enquanto', async () => {
    const premium = await seed('11222333000181', true);
    await seed('11444777000161', false);
    await Case.create({
      Tenant: premium.tenant._id,
      processNumber: '0000002-00.2026.8.26.0100',
      courtType: 'civil',
      role: 'court_expert',
      court: 'TJSP',
      subject: 'Avaliação',
    });

    expect(await enqueueCourtRefresh(now)).toEqual({ batches: 1 });
    const [job] = await WorkerJob.find({ kind: 'court_refresh_batch' }).lean();
    expect(job?.payload).toMatchObject({
      court: 'TRT24',
      cases: [{ caseId: premium.legalCase.id, processNumber: NUMBER, tenantId: premium.tenant.id }],
    });
  });

  it('primeira sincronização só grava a linha de base; movimento novo vira um aviso agrupado', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const cases = [{ tenantId: tenant.id, caseId: legalCase.id, processNumber: NUMBER, court: 'TRT24' }];
    const fetchProcesses = vi
      .fn<DatajudClient['fetchProcesses']>()
      .mockResolvedValueOnce([courtProcess([movement('a', '2026-11-01T10:00:00Z')])])
      .mockResolvedValueOnce([
        courtProcess([
          movement('a', '2026-11-01T10:00:00Z'),
          movement('b', '2026-11-20T10:00:00Z'),
          movement('c', '2026-11-21T10:00:00Z'),
        ]),
      ]);
    const datajud = { fetchProcesses };

    expect(await refreshCourtBatch(datajud, { court: 'TRT24', day: '2026-11-21', cases }, now)).toEqual({
      processes: 1,
      baselines: 1,
      notices: 0,
    });
    expect(await Notification.countDocuments({})).toBe(0);

    expect(await refreshCourtBatch(datajud, { court: 'TRT24', day: '2026-11-22', cases }, now)).toEqual({
      processes: 1,
      baselines: 0,
      notices: 1,
    });
    const [notice] = await Notification.find({}).lean();
    expect(notice).toMatchObject({
      topic: 'court_movement',
      module: 'expert_cases',
      source: 'datajud',
      params: { count: 2 },
    });
    expect((await CaseCourtSync.findOne({}).lean())?.seenMovementKeys.sort()).toEqual(['a', 'b', 'c']);
    expect(await CourtProcess.countDocuments({ processNumber: NUMBER })).toBe(1);
    expect(fetchProcesses).toHaveBeenCalledWith('TRT24', [NUMBER]);
  });
});
