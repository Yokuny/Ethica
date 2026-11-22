import { nextDueByCases } from '@ethica/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as caseRepository from './case.repository.js';
import type { CaseRecord } from './case.schema.js';
import { CaseNotFoundError, createCase, deleteCase, listCases, updateCase } from './case.service.js';
import * as serviceOrderRepository from './service-order.repository.js';

vi.mock('./case.repository.js', () => ({
  createCase: vi.fn(),
  findById: vi.fn(),
  updateCase: vi.fn(),
  deleteCase: vi.fn(),
  listAttachments: vi.fn().mockResolvedValue([]),
  listCases: vi.fn(),
  hasServiceOrder: vi.fn().mockResolvedValue(false),
}));
// Without an office sequence by default: the service is registered without a service order (NLA-01).
vi.mock('./service-order.repository.js', () => ({
  take: vi.fn().mockResolvedValue(null),
  isRetired: vi.fn().mockResolvedValue(false),
  retire: vi.fn(),
}));
vi.mock('@ethica/db', async (original) => ({ ...(await original<object>()), nextDueByCases: vi.fn() }));

const legalCase: CaseRecord = {
  id: 'p1',
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
  parties: [],
  attachments: [],
  movements: [],
  phase: 'awaiting_scheduling',
  status: 'active',
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
  reportDueDate: '2026-12-01',
};

describe('case.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('createCase com prazo do laudo avisa "Entrega do laudo" por case:created e não grava o campo no serviço (AD-264)', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);
    const emit = vi.spyOn(domainEventBus, 'emit');

    await expect(createCase(input)).resolves.toBe(legalCase);

    expect(caseRepository.createCase).toHaveBeenCalledWith(
      expect.not.objectContaining({ reportDueDate: expect.anything() }),
    );
    expect(emit).toHaveBeenCalledWith('case:created', {
      tenantId: 't1',
      caseId: 'p1',
      delivery: expect.objectContaining({ title: 'Entrega do laudo', dueDate: '2026-12-01' }),
    });
  });

  it('createCase sem prazo do laudo avisa o cadastro sem entrega', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);
    const emit = vi.spyOn(domainEventBus, 'emit');
    const { reportDueDate: _p, ...withoutDueDate } = input;

    await createCase(withoutDueDate);

    expect(emit).toHaveBeenCalledWith('case:created', { tenantId: 't1', caseId: 'p1', delivery: undefined });
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

  it('deleteCase avisa case:deleted e guarda a OS como usada; serviço inexistente não avisa', async () => {
    const emit = vi.spyOn(domainEventBus, 'emit');
    vi.mocked(caseRepository.findById).mockResolvedValueOnce({ ...legalCase, serviceOrder: 'ETH-2026-001' });
    vi.mocked(caseRepository.deleteCase).mockResolvedValue({ deletedCount: 1 });
    await deleteCase('t1', 'p1');
    expect(emit).toHaveBeenCalledWith('case:deleted', { tenantId: 't1', caseId: 'p1' });
    expect(serviceOrderRepository.retire).toHaveBeenCalledWith('t1', 'ETH-2026-001');

    emit.mockClear();
    vi.mocked(caseRepository.findById).mockResolvedValueOnce(null);
    await expect(deleteCase('t1', 'nope')).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(emit).not.toHaveBeenCalled();
  });

  it('listPericias anexa o próximo prazo pendente só às perícias que têm um', async () => {
    vi.mocked(caseRepository.listCases).mockResolvedValue({
      items: [legalCase, { ...legalCase, id: 'p2' }],
      total: 2,
    });
    vi.mocked(nextDueByCases).mockResolvedValue(new Map([['p2', { title: 'Esclarecimentos', dueDate: '2026-11-10' }]]));

    const result = await listCases('t1', { page: 1, limit: 20, sort: 'createdAt', order: 'desc' });

    expect(nextDueByCases).toHaveBeenCalledWith('t1', ['p1', 'p2']);
    expect(result.items[0]).not.toHaveProperty('nextDue');
    expect(result.items[1]?.nextDue).toEqual({ title: 'Esclarecimentos', dueDate: '2026-11-10' });
  });

  it('createPericia traduz número duplicado no tenant em 409 pericia_already_registered', async () => {
    vi.mocked(caseRepository.createCase).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const error = await createCase(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CustomError);
    expect(error).toMatchObject({ message: 'expert_case_already_registered', status: 409 });
  });

  it('createCase dá o próximo número da OS do escritório quando o cadastro não traz OS (NLA-01)', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);
    vi.mocked(serviceOrderRepository.take).mockResolvedValueOnce({
      pattern: '[SIGLA]-[ANO]-[NUMERO]',
      prefix: 'ETH',
      digits: 3,
      year: 2026,
      last: 9,
    });

    await createCase(input);
    expect(caseRepository.createCase).toHaveBeenLastCalledWith(
      expect.objectContaining({ serviceOrder: 'ETH-2026-009' }),
    );

    await createCase({ ...input, serviceOrder: 'OS-77' });
    expect(serviceOrderRepository.take).toHaveBeenCalledTimes(1);
    expect(caseRepository.createCase).toHaveBeenLastCalledWith(expect.objectContaining({ serviceOrder: 'OS-77' }));
  });

  it('a sequência pula o número já usado e a OS de serviço excluído é recusada (AD-187)', async () => {
    vi.mocked(caseRepository.createCase).mockResolvedValue(legalCase);
    const settings = { pattern: '[SIGLA]-[ANO]-[NUMERO]', prefix: 'ETH', digits: 3, year: 2026 };
    vi.mocked(serviceOrderRepository.take)
      .mockResolvedValueOnce({ ...settings, last: 9 })
      .mockResolvedValueOnce({ ...settings, last: 10 });
    vi.mocked(caseRepository.hasServiceOrder).mockResolvedValueOnce(true);

    await createCase(input);
    expect(caseRepository.createCase).toHaveBeenLastCalledWith(
      expect.objectContaining({ serviceOrder: 'ETH-2026-010' }),
    );

    vi.mocked(serviceOrderRepository.isRetired).mockResolvedValueOnce(true);
    await expect(createCase({ ...input, serviceOrder: 'ETH-2026-001' })).rejects.toMatchObject({
      message: 'service_order_taken',
      status: 409,
    });
  });

  it('createCase traduz OS repetida em 409 service_order_taken', async () => {
    vi.mocked(caseRepository.createCase).mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000, keyPattern: { Tenant: 1, serviceOrder: 1 } }),
    );

    await expect(createCase({ ...input, serviceOrder: 'OS-77' })).rejects.toMatchObject({
      message: 'service_order_taken',
      status: 409,
    });
  });

  it('updatePericia emite honorarios_fixados só quando o valor fixado muda', async () => {
    const emit = vi.spyOn(domainEventBus, 'emit');
    vi.mocked(caseRepository.findById).mockResolvedValue({ ...legalCase, fixedFeesCents: 100_000 });
    vi.mocked(caseRepository.updateCase).mockResolvedValue({ ...legalCase, fixedFeesCents: 100_000 });

    await updateCase('t1', 'p1', { phase: 'inspection_scheduled' });
    expect(emit).not.toHaveBeenCalled();

    vi.mocked(caseRepository.updateCase).mockResolvedValue({ ...legalCase, fixedFeesCents: 250_000 });
    await updateCase('t1', 'p1', { fixedFeesCents: 250_000 });
    expect(emit).toHaveBeenCalledWith('case:fixed_fees', {
      tenantId: 't1',
      caseId: 'p1',
      caseLabel: legalCase.processNumber,
      amountCents: 250_000,
      category: 'fixed_fees',
    });
  });

  it('updatePericia de id inexistente (ou de outro tenant) é PericiaNotFoundError', async () => {
    vi.mocked(caseRepository.findById).mockResolvedValue(null);

    await expect(updateCase('t1', 'nope', { phase: 'inspection_scheduled' })).rejects.toBeInstanceOf(CaseNotFoundError);
  });
});

describe('contratante na perícia (AD-135)', () => {
  it('recusa contratante em perícia de perito do juízo', async () => {
    vi.mocked(caseRepository.findById).mockResolvedValue(legalCase);
    await expect(
      updateCase('t1', 'p1', { parties: [{ side: 'plaintiff', type: 'party', name: 'Fulano', client: true }] }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
