import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as caseRepository from './case.repository.js';
import type { CaseRecord } from './case.schema.js';
import {
  CaseNotFoundError,
  createCase,
  deleteCase,
  listCases,
  resolveStatusAndPhase,
  updateCase,
} from './case.service.js';
import * as deadlineRepository from './deadline.repository.js';

vi.mock('./case.repository.js', () => ({
  createCase: vi.fn(),
  findById: vi.fn(),
  updateCase: vi.fn(),
  deleteCase: vi.fn(),
  listCases: vi.fn(),
}));
vi.mock('./deadline.repository.js', () => ({
  createDeadline: vi.fn(),
  deleteByCase: vi.fn(),
  upcomingByCaseIds: vi.fn(),
}));

const legalCase: CaseRecord = {
  id: 'p1',
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
  parties: [],
  movements: [],
  status: 'appointed',
  state: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const input = {
  tenant: 't1',
  processNumber: legalCase.processNumber,
  courtType: legalCase.courtType,
  role: legalCase.role,
  court: legalCase.court,
  subject: legalCase.subject,
  reportDeadline: '2026-12-01',
};

describe('case.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('createPericia com prazo do laudo cria o prazo pendente "Entrega do laudo" e não grava o campo na perícia (PRZ-01.4)', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);

    await expect(createCase(input)).resolves.toBe(legalCase);

    expect(caseRepository.createCase).toHaveBeenCalledWith(
      expect.not.objectContaining({ reportDeadline: expect.anything() }),
    );
    expect(deadlineRepository.createDeadline).toHaveBeenCalledWith(
      't1',
      'p1',
      expect.objectContaining({ titulo: 'Entrega do laudo', dueDate: '2026-12-01' }),
    );
  });

  it('createPericia sem prazo do laudo não cria prazo', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);
    const { reportDeadline: _p, ...withoutDeadline } = input;

    await createCase(withoutDeadline);

    expect(deadlineRepository.createDeadline).not.toHaveBeenCalled();
  });

  it('createPericia grava o período imprescrito sugerido quando vem vazio (AD-115)', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);

    await createCase({
      ...input,
      docketingDate: '2026-03-10',
      hireDate: '2018-02-01',
      terminationDate: '2025-12-20',
    });
    expect(caseRepository.createCase).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nonPrescribedPeriodStart: '2021-03-10',
        nonPrescribedPeriodEnd: '2025-12-20',
        parties: [],
      }),
    );

    await createCase({ ...input, docketingDate: '2026-03-10', nonPrescribedPeriodStart: '2022-01-01' });
    expect(caseRepository.createCase).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ nonPrescribedPeriodEnd: expect.anything() }),
    );
  });

  it('deletePericia exclui os prazos da perícia; perícia inexistente não toca nos prazos', async () => {
    vi.mocked(caseRepository.deleteCase).mockResolvedValue({ deletedCount: 1 });
    await deleteCase('t1', 'p1');
    expect(deadlineRepository.deleteByCase).toHaveBeenCalledWith('t1', 'p1');

    vi.mocked(deadlineRepository.deleteByCase).mockClear();
    vi.mocked(caseRepository.deleteCase).mockResolvedValue({ deletedCount: 0 });
    await expect(deleteCase('t1', 'nope')).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(deadlineRepository.deleteByCase).not.toHaveBeenCalled();
  });

  it('listPericias anexa o próximo prazo pendente só às perícias que têm um', async () => {
    vi.mocked(caseRepository.listCases).mockResolvedValue({
      items: [legalCase, { ...legalCase, id: 'p2' }],
      total: 2,
    });
    vi.mocked(deadlineRepository.upcomingByCaseIds).mockResolvedValue(
      new Map([['p2', { titulo: 'Esclarecimentos', dueDate: '2026-11-10' }]]),
    );

    const result = await listCases('t1', { page: 1, limit: 20 });

    expect(deadlineRepository.upcomingByCaseIds).toHaveBeenCalledWith('t1', ['p1', 'p2']);
    expect(result.items[0]).not.toHaveProperty('nextDeadline');
    expect(result.items[1]?.nextDeadline).toEqual({ titulo: 'Esclarecimentos', dueDate: '2026-11-10' });
  });

  it('createPericia traduz número duplicado no tenant em 409 pericia_already_registered', async () => {
    vi.mocked(caseRepository.createCase).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const error = await createCase(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CustomError);
    expect(error).toMatchObject({ message: 'expert_case_already_registered', status: 409 });
  });

  it('updatePericia emite honorarios_fixados só quando o valor fixado muda', async () => {
    const emit = vi.spyOn(domainEventBus, 'emit');
    vi.mocked(caseRepository.findById).mockResolvedValue({ ...legalCase, fixedFeesCents: 100_000 });
    vi.mocked(caseRepository.updateCase).mockResolvedValue({ ...legalCase, fixedFeesCents: 100_000 });

    await updateCase('t1', 'p1', { status: 'accepted' });
    expect(emit).not.toHaveBeenCalled();

    vi.mocked(caseRepository.updateCase).mockResolvedValue({ ...legalCase, fixedFeesCents: 250_000 });
    await updateCase('t1', 'p1', { fixedFeesCents: 250_000 });
    expect(emit).toHaveBeenCalledWith('case:fixed_fees', {
      tenantId: 't1',
      caseId: 'p1',
      processNumber: legalCase.processNumber,
      amountCents: 250_000,
      category: 'fixed_fees',
    });
  });

  it('updatePericia de id inexistente (ou de outro tenant) é PericiaNotFoundError', async () => {
    vi.mocked(caseRepository.findById).mockResolvedValue(null);

    await expect(updateCase('t1', 'nope', { status: 'accepted' })).rejects.toBeInstanceOf(CaseNotFoundError);
  });
});

describe('resolverEtapaEFase (AD-133)', () => {
  it('a fase de uma etapa leva a perícia a ela', () => {
    expect(resolveStatusAndPhase({ status: 'inspection' }, { phase: 'reviewing_report' })).toEqual({
      status: 'drafting_report',
      phase: 'reviewing_report',
    });
  });

  it('suspensão mantém a etapa', () => {
    expect(resolveStatusAndPhase({ status: 'inspection' }, { phase: 'settlement' })).toEqual({
      status: 'inspection',
      phase: 'settlement',
    });
  });

  it('mudar só a etapa apaga a fase que não cabe e mantém a que cabe', () => {
    expect(
      resolveStatusAndPhase({ status: 'inspection', phase: 'awaiting_inspection' }, { status: 'drafting_report' }),
    ).toEqual({ status: 'drafting_report', phase: null });
    expect(resolveStatusAndPhase({ status: 'inspection', phase: 'withdrawal' }, { status: 'drafting_report' })).toEqual(
      {
        status: 'drafting_report',
        phase: 'withdrawal',
      },
    );
  });

  it('recusa fase e etapa incoerentes no mesmo pedido', () => {
    expect(() =>
      resolveStatusAndPhase({ status: 'inspection' }, { status: 'completed', phase: 'reviewing_report' }),
    ).toThrow(CustomError);
  });

  it('null apaga a fase', () => {
    expect(resolveStatusAndPhase({ status: 'inspection', phase: 'settlement' }, { phase: null })).toEqual({
      status: 'inspection',
      phase: null,
    });
  });
});

describe('contratante na perícia (AD-135)', () => {
  it('recusa contratante em perícia de perito do juízo', async () => {
    vi.mocked(caseRepository.findById).mockResolvedValue(legalCase);
    await expect(
      updateCase('t1', 'p1', { parties: [{ side: 'plaintiff', tipo: 'party', nome: 'Fulano', client: true }] }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
