import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaRepository from './pericia.repository.js';
import type { PericiaRecord } from './pericia.schema.js';
import { createPericia, deletePericia, listPericias, PericiaNotFoundError, updatePericia } from './pericia.service.js';
import * as prazoRepository from './prazo.repository.js';

vi.mock('./pericia.repository.js', () => ({
  createPericia: vi.fn(),
  findById: vi.fn(),
  updatePericia: vi.fn(),
  deletePericia: vi.fn(),
  listPericias: vi.fn(),
}));
vi.mock('./prazo.repository.js', () => ({
  createPrazo: vi.fn(),
  deleteByPericia: vi.fn(),
  proximosByPericiaIds: vi.fn(),
}));

const pericia: PericiaRecord = {
  id: 'p1',
  numeroProcesso: '0001234-56.2026.5.02.0001',
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT2',
  objeto: 'Insalubridade',
  status: 'appointed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const input = {
  tenant: 't1',
  numeroProcesso: pericia.numeroProcesso,
  justica: pericia.justica,
  papel: pericia.papel,
  tribunal: pericia.tribunal,
  objeto: pericia.objeto,
  prazoLaudo: '2026-12-01',
};

describe('pericia.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('createPericia com prazo do laudo cria o prazo pendente "Entrega do laudo" e não grava o campo na perícia (PRZ-01.4)', async () => {
    vi.mocked(periciaRepository.createPericia).mockResolvedValue(pericia);

    await expect(createPericia(input)).resolves.toBe(pericia);

    expect(periciaRepository.createPericia).toHaveBeenCalledWith(
      expect.not.objectContaining({ prazoLaudo: expect.anything() }),
    );
    expect(prazoRepository.createPrazo).toHaveBeenCalledWith(
      't1',
      'p1',
      expect.objectContaining({ titulo: 'Entrega do laudo', vencimento: '2026-12-01' }),
    );
  });

  it('createPericia sem prazo do laudo não cria prazo', async () => {
    vi.mocked(periciaRepository.createPericia).mockResolvedValue(pericia);
    const { prazoLaudo: _p, ...semPrazo } = input;

    await createPericia(semPrazo);

    expect(prazoRepository.createPrazo).not.toHaveBeenCalled();
  });

  it('deletePericia exclui os prazos da perícia; perícia inexistente não toca nos prazos', async () => {
    vi.mocked(periciaRepository.deletePericia).mockResolvedValue({ deletedCount: 1 });
    await deletePericia('t1', 'p1');
    expect(prazoRepository.deleteByPericia).toHaveBeenCalledWith('t1', 'p1');

    vi.mocked(prazoRepository.deleteByPericia).mockClear();
    vi.mocked(periciaRepository.deletePericia).mockResolvedValue({ deletedCount: 0 });
    await expect(deletePericia('t1', 'nope')).rejects.toBeInstanceOf(PericiaNotFoundError);
    expect(prazoRepository.deleteByPericia).not.toHaveBeenCalled();
  });

  it('listPericias anexa o próximo prazo pendente só às perícias que têm um', async () => {
    vi.mocked(periciaRepository.listPericias).mockResolvedValue({
      items: [pericia, { ...pericia, id: 'p2' }],
      total: 2,
    });
    vi.mocked(prazoRepository.proximosByPericiaIds).mockResolvedValue(
      new Map([['p2', { titulo: 'Esclarecimentos', vencimento: '2026-11-10' }]]),
    );

    const result = await listPericias('t1', { page: 1, limit: 20 });

    expect(prazoRepository.proximosByPericiaIds).toHaveBeenCalledWith('t1', ['p1', 'p2']);
    expect(result.items[0]).not.toHaveProperty('proximoPrazo');
    expect(result.items[1]?.proximoPrazo).toEqual({ titulo: 'Esclarecimentos', vencimento: '2026-11-10' });
  });

  it('createPericia traduz número duplicado no tenant em 409 pericia_already_registered', async () => {
    vi.mocked(periciaRepository.createPericia).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const error = await createPericia(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CustomError);
    expect(error).toMatchObject({ message: 'expert_case_already_registered', status: 409 });
  });

  it('updatePericia emite honorarios_fixados só quando o valor fixado muda', async () => {
    const emit = vi.spyOn(domainEventBus, 'emit');
    vi.mocked(periciaRepository.findById).mockResolvedValue({ ...pericia, honorariosFixadosCents: 100_000 });
    vi.mocked(periciaRepository.updatePericia).mockResolvedValue({ ...pericia, honorariosFixadosCents: 100_000 });

    await updatePericia('t1', 'p1', { status: 'accepted' });
    expect(emit).not.toHaveBeenCalled();

    vi.mocked(periciaRepository.updatePericia).mockResolvedValue({ ...pericia, honorariosFixadosCents: 250_000 });
    await updatePericia('t1', 'p1', { honorariosFixadosCents: 250_000 });
    expect(emit).toHaveBeenCalledWith('pericia:honorarios_fixados', {
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: pericia.numeroProcesso,
      valorCents: 250_000,
    });
  });

  it('updatePericia de id inexistente (ou de outro tenant) é PericiaNotFoundError', async () => {
    vi.mocked(periciaRepository.findById).mockResolvedValue(null);

    await expect(updatePericia('t1', 'nope', { status: 'accepted' })).rejects.toBeInstanceOf(PericiaNotFoundError);
  });
});
