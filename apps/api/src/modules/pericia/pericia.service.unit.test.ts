import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainEventBus } from '../../events/event-bus.js';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaRepository from './pericia.repository.js';
import type { PericiaRecord } from './pericia.schema.js';
import { createPericia, PericiaNotFoundError, updatePericia } from './pericia.service.js';

vi.mock('./pericia.repository.js', () => ({
  createPericia: vi.fn(),
  findById: vi.fn(),
  updatePericia: vi.fn(),
}));

const pericia: PericiaRecord = {
  id: 'p1',
  numeroProcesso: '0001234-56.2026.5.02.0001',
  justica: 'trabalhista',
  papel: 'perito',
  tribunal: 'TRT2',
  objeto: 'Insalubridade',
  status: 'nomeada',
  prazoLaudo: '2026-12-01',
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
  prazoLaudo: pericia.prazoLaudo,
};

describe('pericia.service', () => {
  afterEach(() => vi.restoreAllMocks());

  it('createPericia emite pericia:created com o prazo do laudo', async () => {
    vi.mocked(periciaRepository.createPericia).mockResolvedValue(pericia);
    const emit = vi.spyOn(domainEventBus, 'emit');

    await expect(createPericia(input)).resolves.toBe(pericia);

    expect(emit).toHaveBeenCalledWith('pericia:created', {
      tenantId: 't1',
      periciaId: 'p1',
      numeroProcesso: pericia.numeroProcesso,
      prazoLaudo: '2026-12-01',
    });
  });

  it('createPericia traduz número duplicado no tenant em 409 pericia_already_registered', async () => {
    vi.mocked(periciaRepository.createPericia).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const error = await createPericia(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CustomError);
    expect(error).toMatchObject({ message: 'pericia_already_registered', status: 409 });
  });

  it('updatePericia emite honorarios_fixados só quando o valor fixado muda', async () => {
    const emit = vi.spyOn(domainEventBus, 'emit');
    vi.mocked(periciaRepository.findById).mockResolvedValue({ ...pericia, honorariosFixadosCents: 100_000 });
    vi.mocked(periciaRepository.updatePericia).mockResolvedValue({ ...pericia, honorariosFixadosCents: 100_000 });

    await updatePericia('t1', 'p1', { status: 'aceita' });
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

    await expect(updatePericia('t1', 'nope', { status: 'aceita' })).rejects.toBeInstanceOf(PericiaNotFoundError);
  });
});
