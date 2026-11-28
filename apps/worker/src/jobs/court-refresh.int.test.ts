import type { CourtProcessData, DatajudClient } from '@ethica/datajud';
import {
  Case,
  CaseCourtSync,
  CourtProcess,
  CourtSyncDay,
  connect,
  disconnect,
  Notification,
  syncWorkerIndexes,
  Tenant,
  Transaction,
  WorkerJob,
} from '@ethica/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BATCH_MAX_ATTEMPTS, enqueueCourtRefresh, refreshCourtBatch } from './court-refresh.js';
import { expireSuggestions } from './suggestions-expire.js';

const now = new Date('2026-11-22T09:00:00.000Z');
const NUMBER = '0024364-65.2020.5.24.0091';

const movement = (key: string, at: string, code = 60) => ({
  key,
  code,
  name: `Movimento ${code}`,
  at,
  complements: [],
});
const courtProcess = (movements: CourtProcessData['movements']): CourtProcessData => ({
  court: 'TRT24',
  processNumber: NUMBER,
  degree: 'G1',
  subjects: [],
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
      [Case, CaseCourtSync, CourtProcess, CourtSyncDay, Notification, Tenant, Transaction, WorkerJob].map((model) =>
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
      serviceType: 'expert_examination',
      phase: 'awaiting_scheduling',
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
      serviceType: 'expert_examination',
      phase: 'awaiting_scheduling',
      court: 'TJSP',
      subject: 'Avaliação',
    });

    expect(await enqueueCourtRefresh(now)).toEqual({ batches: 1, courts: { TRT24: 1 } });
    const [job] = await WorkerJob.find({ kind: 'court_refresh_batch' }).lean();
    expect(job?.maxAttempts).toBe(BATCH_MAX_ATTEMPTS);
    expect(job?.payload).toMatchObject({
      court: 'TRT24',
      cases: [{ caseId: premium.legalCase.id, processNumber: NUMBER, tenantId: premium.tenant.id }],
    });
  });

  it('primeira sincronização só grava a linha de base; movimento novo vira um aviso agrupado', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const cases = [
      {
        tenantId: tenant.id,
        caseId: legalCase.id,
        processNumber: NUMBER,
        court: 'TRT24',
        serviceType: 'expert_examination' as const,
        status: 'active' as const,
        phase: 'drafting_report' as const,
      },
    ];
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
      suggestions: 0,
      notFound: 0,
    });
    expect(await Notification.countDocuments({})).toBe(0);

    expect(await refreshCourtBatch(datajud, { court: 'TRT24', day: '2026-11-22', cases }, now)).toEqual({
      processes: 1,
      baselines: 0,
      notices: 1,
      suggestions: 0,
      notFound: 0,
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

  it('acordo homologado vira sugestão pendente (sem mudar o serviço); sem o módulo ela expira', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const fetchProcesses = vi
      .fn<DatajudClient['fetchProcesses']>()
      .mockResolvedValueOnce([courtProcess([movement('a', '2026-11-01T10:00:00Z')])])
      .mockResolvedValueOnce([
        courtProcess([movement('a', '2026-11-01T10:00:00Z'), movement('s', '2026-11-21T10:00:00Z', 466)]),
      ]);
    await refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day: '2026-11-21', cases: [item] }, now);
    const result = await refreshCourtBatch(
      { fetchProcesses },
      { court: 'TRT24', day: '2026-11-22', cases: [item] },
      now,
    );
    expect(result).toMatchObject({ notices: 1, suggestions: 1 });
    const [suggestion] = await Notification.find({ kind: 'suggestion' }).lean();
    expect(suggestion).toMatchObject({
      status: 'pending',
      ruleKey: 'case_settlement',
      proposal: { target: 'case_phase', value: 'settlement' },
      evidence: { court: 'TRT24', movement: { code: 466 } },
    });
    expect((await Case.findById(legalCase._id).lean())?.phase).not.toBe('settlement');

    expect(await expireSuggestions(now)).toEqual({ expired: 0, superseded: 0 });
    await Tenant.updateOne({ _id: tenant._id }, { $unset: { automationUntil: 1 } });
    expect(await expireSuggestions(now)).toEqual({ expired: 1, superseded: 0 });
  });

  it('pagamento (AD-274): requisição vira aviso; alvarás do dia viram uma sugestão de recebimento com e-mail na hora', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'fees_received' as const,
    };
    const alvara = (key: string) => ({
      ...movement(key, '2026-11-21T10:00:00Z', 60),
      complements: [{ code: 4, description: 'tipo_de_documento', value: 73, name: 'Alvará' }],
    });
    const fetchProcesses = vi
      .fn<DatajudClient['fetchProcesses']>()
      .mockResolvedValueOnce([courtProcess([movement('a', '2026-11-01T10:00:00Z')])])
      .mockResolvedValueOnce([
        courtProcess([
          movement('a', '2026-11-01T10:00:00Z'),
          movement('r', '2026-11-10T10:00:00Z', 12165),
          alvara('x1'),
          alvara('x2'),
        ]),
      ]);
    await refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day: '2026-11-21', cases: [item] }, now);
    await refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day: '2026-11-22', cases: [item] }, now);

    expect(await Notification.countDocuments({ topic: 'payment_in_progress', module: 'finance' })).toBe(1);
    const suggestions = await Notification.find({ kind: 'suggestion' }).lean();
    expect(suggestions).toEqual([
      expect.objectContaining({
        module: 'finance',
        severity: 'critical',
        proposal: { target: 'transaction_installment', date: '2026-11-21' },
      }),
    ]);
    expect(await WorkerJob.countDocuments({ kind: 'email_immediate' })).toBe(1);
  });

  it('falha no meio do lote: a nova tentativa ainda cria o aviso e a sugestão (nada se perde)', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const second = [courtProcess([movement('a', '2026-11-01T10:00:00Z'), movement('s', '2026-11-21T10:00:00Z', 466)])];
    const fetchProcesses = vi
      .fn<DatajudClient['fetchProcesses']>()
      .mockResolvedValueOnce([courtProcess([movement('a', '2026-11-01T10:00:00Z')])])
      .mockResolvedValue(second);
    const batch = (day: string) => refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day, cases: [item] }, now);
    await batch('2026-11-21');

    const create = vi.spyOn(Notification, 'create').mockRejectedValueOnce(new Error('queda'));
    await expect(batch('2026-11-22')).rejects.toThrow('queda');
    create.mockRestore();
    expect(await batch('2026-11-22')).toMatchObject({ notices: 1, suggestions: 1 });
    expect(await Notification.countDocuments({ kind: 'suggestion', ruleKey: 'case_settlement' })).toBe(1);
  });

  it('não encontrado grava só a data; quando o processo aparece vira linha de base sem aviso (PAC-02)', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const later = new Date('2026-11-23T09:00:00.000Z');
    const fetchProcesses = vi
      .fn<DatajudClient['fetchProcesses']>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([courtProcess([movement('a', '2026-11-01T10:00:00Z')])])
      .mockResolvedValueOnce([
        courtProcess([movement('a', '2026-11-01T10:00:00Z'), movement('b', '2026-11-22T10:00:00Z')]),
      ])
      .mockResolvedValueOnce([]);
    const batch = (day: string, at: Date) =>
      refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day, cases: [item] }, at);

    expect(await batch('2026-11-21', now)).toMatchObject({ processes: 0, baselines: 0, notFound: 1 });
    const notFound = await CaseCourtSync.findOne({}).lean();
    expect(notFound).toMatchObject({ court: 'TRT24', processNumber: NUMBER, syncedAt: now, seenMovementKeys: [] });
    expect(notFound?.baselineAt).toBeUndefined();

    expect(await batch('2026-11-22', later)).toMatchObject({ baselines: 1, notices: 0 });
    expect(await Notification.countDocuments({})).toBe(0);
    expect(await CaseCourtSync.findOne({}).lean()).toMatchObject({ baselineAt: later, seenMovementKeys: ['a'] });

    expect(await batch('2026-11-23', later)).toMatchObject({ baselines: 0, notices: 1 });

    // Not found again one day: the process stays synced, only the date moves.
    const latest = new Date('2026-11-24T09:00:00.000Z');
    await batch('2026-11-24', latest);
    expect(await CaseCourtSync.findOne({}).lean()).toMatchObject({ baselineAt: later, syncedAt: latest });
    expect(await CaseCourtSync.countDocuments({})).toBe(1);
  });

  it('registro do dia (PAT-06): processos da rodada, resposta contada uma vez, movimentos novos e avisos', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const day1 = new Date('2026-11-21T09:00:00.000Z');
    await enqueueCourtRefresh(day1);
    await enqueueCourtRefresh(now);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const fetchProcesses = vi
      .fn<DatajudClient['fetchProcesses']>()
      .mockResolvedValueOnce([courtProcess([movement('a', '2026-11-01T10:00:00Z')])])
      .mockResolvedValue([
        courtProcess([
          movement('a', '2026-11-01T10:00:00Z'),
          movement('b', '2026-11-20T10:00:00Z'),
          movement('c', '2026-11-21T10:00:00Z'),
        ]),
      ]);
    const batch = (day: string) => refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day, cases: [item] }, now);
    const row = async (day: string) => CourtSyncDay.findOne({ Tenant: tenant._id, day }).lean();

    // Baseline: answered and found, nothing new (the past of the process is not work of the automation).
    await batch('2026-11-21');
    expect(await row('2026-11-21')).toMatchObject({
      tracked: 1,
      found: 1,
      notFound: 0,
      newMovements: 0,
      notices: { expert_cases: 0, finance: 0 },
    });

    // Two new movements, one notice; the retried batch of the same day adds nothing.
    await batch('2026-11-22');
    await batch('2026-11-22');
    const second = await row('2026-11-22');
    expect(second).toMatchObject({ tracked: 1, found: 1, newMovements: 2, notices: { expert_cases: 1, finance: 0 } });
    expect(second?.answeredCases.map(String)).toEqual([legalCase.id]);
    expect(await CaseCourtSync.findOne({}).lean()).toMatchObject({
      lastMovementAt: new Date('2026-11-21T10:00:00Z'),
      lastMovementName: 'Movimento 60',
    });
  });

  it('registro do dia: não encontrado conta uma vez; sem resposta fica fora dos respondidos', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    await enqueueCourtRefresh(now);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const failing = vi.fn<DatajudClient['fetchProcesses']>().mockRejectedValue(new Error('429'));
    await expect(
      refreshCourtBatch({ fetchProcesses: failing }, { court: 'TRT24', day: '2026-11-22', cases: [item] }, now),
    ).rejects.toThrow();
    expect(await CourtSyncDay.findOne({ Tenant: tenant._id }).lean()).toMatchObject({ tracked: 1, answeredCases: [] });

    const empty = vi.fn<DatajudClient['fetchProcesses']>().mockResolvedValue([]);
    const batch = () =>
      refreshCourtBatch({ fetchProcesses: empty }, { court: 'TRT24', day: '2026-11-22', cases: [item] }, now);
    await batch();
    await batch();
    expect(await CourtSyncDay.findOne({ Tenant: tenant._id }).lean()).toMatchObject({ found: 0, notFound: 1 });
  });

  it('consulta que falha não grava nada', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const fetchProcesses = vi.fn<DatajudClient['fetchProcesses']>().mockRejectedValueOnce(new Error('429'));
    await expect(
      refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day: '2026-11-21', cases: [item] }, now),
    ).rejects.toThrow('429');
    expect(await CaseCourtSync.countDocuments({})).toBe(0);
  });

  it('preenche a vara e a data de ajuizamento vazias com os dados do tribunal, uma vez por serviço (SGD-07)', async () => {
    const { tenant, legalCase } = await seed('11222333000181', true);
    const item = {
      tenantId: tenant.id,
      caseId: legalCase.id,
      processNumber: NUMBER,
      court: 'TRT24',
      serviceType: 'expert_examination' as const,
      status: 'active' as const,
      phase: 'drafting_report' as const,
    };
    const found = {
      ...courtProcess([movement('a', '2026-11-01T10:00:00Z')]),
      courtUnitName: 'VARA DO TRABALHO DE BATAGUASSU',
      filedAt: '2021-04-20',
    };
    const datajud = { fetchProcesses: vi.fn<DatajudClient['fetchProcesses']>().mockResolvedValue([found]) };

    // On the baseline too: the first query already fills.
    expect(await refreshCourtBatch(datajud, { court: 'TRT24', day: '2026-11-21', cases: [item] }, now)).toMatchObject({
      baselines: 1,
      suggestions: 1,
    });
    const [suggestion] = await Notification.find({ ruleKey: 'case_fill' }).lean();
    expect(suggestion?.proposal).toEqual({
      target: 'case_fill',
      division: 'Vara do Trabalho de Bataguassu',
      docketingDate: '2021-04-20',
    });
    // Once per case; a case with both fields typed gets nothing.
    await refreshCourtBatch(datajud, { court: 'TRT24', day: '2026-11-22', cases: [item] }, now);
    expect(await Notification.countDocuments({ ruleKey: 'case_fill' })).toBe(1);
    await Notification.deleteMany({});
    await refreshCourtBatch(
      datajud,
      {
        court: 'TRT24',
        day: '2026-11-23',
        cases: [{ ...item, division: '1ª Vara do Trabalho', docketingDate: '2021-04-21' }],
      },
      now,
    );
    expect(await Notification.countDocuments({ ruleKey: 'case_fill' })).toBe(0);
  });

  describe('hora de cobrar e de encerrar pelo estado do processo (SGD-05, AD-309)', () => {
    const run = async (movements: CourtProcessData['movements'], day: string, serviceType = 'expert_examination') => {
      const [office] = await Tenant.find({}).lean();
      const [legalCase] = await Case.find({}).lean();
      const item = {
        tenantId: String(office?._id),
        caseId: String(legalCase?._id),
        processNumber: NUMBER,
        court: 'TRT24',
        serviceType: serviceType as 'expert_examination',
        status: 'active' as const,
        phase: 'awaiting_judge' as const,
      };
      const fetchProcesses = vi.fn<DatajudClient['fetchProcesses']>().mockResolvedValue([courtProcess(movements)]);
      return refreshCourtBatch({ fetchProcesses }, { court: 'TRT24', day, cases: [item] }, now);
    };
    const income = async (status: 'expected' | 'settled') => {
      const [legalCase] = await Case.find({}).lean();
      return Transaction.create({
        Tenant: legalCase?.Tenant,
        Case: legalCase?._id,
        kind: 'income',
        category: 'fixed_fees',
        description: 'Honorários periciais',
        amountCents: 300_000,
        dueDate: '2026-12-01',
        status,
      });
    };
    const base = movement('a', '2026-01-01T10:00:00Z', 26);

    it('cobra uma vez só, com o lançamento em aberto, só depois da linha de base', async () => {
      await seed('11222333000181', true);
      const open = await income('expected');
      await run([base, movement('t', '2026-11-10T10:00:00Z', 848)], '2026-11-20');
      expect(await Notification.countDocuments({ topic: 'fees_collection' })).toBe(0);
      await run([base, movement('t', '2026-11-10T10:00:00Z', 848)], '2026-11-21');
      await run(
        [base, movement('t', '2026-11-10T10:00:00Z', 848), movement('l', '2026-11-21T10:00:00Z', 11384)],
        '2026-11-22',
      );
      const notices = await Notification.find({ topic: 'fees_collection' }).lean();
      expect(notices.map((notice) => [notice.module, String(notice.Transaction), notice.expireAt])).toEqual([
        ['finance', open.id, undefined],
      ]);
    });

    it('encerrado com honorário recebido sugere a fase; em aberto avisa; sem receita lançada, nada', async () => {
      await seed('11222333000181', true);
      const finished = [base, movement('arq', '2026-11-10T10:00:00Z', 246)];
      await run([base], '2026-11-20');
      await run(finished, '2026-11-21');
      expect(await Notification.countDocuments({ source: 'datajud', kind: { $ne: 'notice' } })).toBe(0);
      expect(await Notification.countDocuments({ topic: 'fees_open_finished' })).toBe(0);

      const open = await income('expected');
      await run(finished, '2026-11-22');
      expect((await Notification.findOne({ topic: 'fees_open_finished' }).lean())?.Transaction?.toString()).toBe(
        open.id,
      );

      await Transaction.updateOne({ _id: open._id }, { status: 'settled' });
      await run(finished, '2026-11-23');
      const [suggestion] = await Notification.find({ ruleKey: 'case_finished' }).lean();
      expect(suggestion?.proposal).toEqual({ target: 'case_phase', value: 'fees_received' });
    });

    it('a RPV paga depois do arquivamento segura o encerramento até o recebimento ser decidido', async () => {
      await seed('11222333000181', true);
      const open = await income('expected');
      await run([base], '2026-11-20');
      const paidAfter = [
        base,
        movement('arq', '2026-11-10T10:00:00Z', 246),
        movement('rpv', '2026-11-12T10:00:00Z', 12176),
      ];
      await run(paidAfter, '2026-11-21');
      const receipt = await Notification.findOne({ ruleKey: 'payment_available' }).lean();
      expect(receipt?.Transaction?.toString()).toBe(open.id);
      expect(await Notification.countDocuments({ topic: 'fees_open_finished' })).toBe(0);

      // Rejected: the next query warns of the open fee.
      await Notification.updateOne({ _id: receipt?._id }, { status: 'rejected' });
      await run(paidAfter, '2026-11-22');
      expect(await Notification.countDocuments({ topic: 'fees_open_finished' })).toBe(1);
    });
  });
});
