import { describe, expect, it, vi } from 'vitest';
import * as periciaService from '../pericia/pericia.service.js';
import * as compromissoRepository from './compromisso.repository.js';
import { createCompromisso, listCompromissos } from './compromisso.service.js';

vi.mock('./compromisso.repository.js', () => ({ createCompromisso: vi.fn(), listInRange: vi.fn() }));
vi.mock('../pericia/pericia.service.js', () => ({ getPericia: vi.fn(), findResumosByIds: vi.fn() }));

describe('compromisso.service', () => {
  it('createCompromisso converte data/hora de parede + duração no intervalo UTC', async () => {
    await createCompromisso('t1', {
      tipo: 'vistoria',
      titulo: 'Vistoria na fábrica',
      date: '2026-11-10',
      time: '09:00',
      duracaoMinutos: 90,
    });

    expect(compromissoRepository.createCompromisso).toHaveBeenCalledWith('t1', {
      tipo: 'vistoria',
      titulo: 'Vistoria na fábrica',
      inicio: new Date('2026-11-10T12:00:00.000Z'),
      fim: new Date('2026-11-10T13:30:00.000Z'),
    });
  });

  it('listCompromissos enriquece com o número do processo numa consulta só', async () => {
    vi.mocked(compromissoRepository.listInRange).mockResolvedValue([
      { id: 'c1', periciaId: 'p1' },
      { id: 'c2', periciaId: 'p1' },
      { id: 'c3', periciaId: 'p-apagada' },
    ] as never);
    vi.mocked(periciaService.findResumosByIds).mockResolvedValue(new Map([['p1', { numeroProcesso: '0001' }]]));

    const items = await listCompromissos('t1', { from: '2026-11-01', to: '2026-12-01' });

    expect(periciaService.findResumosByIds).toHaveBeenCalledWith('t1', ['p1', 'p-apagada']);
    expect(items.map((item) => item.periciaNumero)).toEqual(['0001', '0001', undefined]);
    expect(items[2]).not.toHaveProperty('periciaNumero');
  });
});
