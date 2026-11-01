import { describe, expect, it, vi } from 'vitest';
import * as caseService from '../case/case.service.js';
import * as appointmentRepository from './appointment.repository.js';
import { createAppointment, listAppointments } from './appointment.service.js';

vi.mock('./appointment.repository.js', () => ({ createAppointment: vi.fn(), listInRange: vi.fn() }));
vi.mock('../case/case.service.js', () => ({ getCase: vi.fn(), findSummariesByIds: vi.fn() }));

describe('appointment.service', () => {
  it('createCompromisso converte data/hora de parede + duração no intervalo UTC', async () => {
    await createAppointment('t1', {
      type: 'inspection',
      title: 'Vistoria na fábrica',
      date: '2026-11-10',
      time: '09:00',
      durationMinutes: 90,
    });

    expect(appointmentRepository.createAppointment).toHaveBeenCalledWith('t1', {
      type: 'inspection',
      title: 'Vistoria na fábrica',
      start: new Date('2026-11-10T12:00:00.000Z'),
      end: new Date('2026-11-10T13:30:00.000Z'),
    });
  });

  it('listCompromissos enriquece com o número do processo numa consulta só', async () => {
    vi.mocked(appointmentRepository.listInRange).mockResolvedValue([
      { id: 'c1', caseId: 'p1' },
      { id: 'c2', caseId: 'p1' },
      { id: 'c3', caseId: 'p-apagada' },
    ] as never);
    vi.mocked(caseService.findSummariesByIds).mockResolvedValue(new Map([['p1', { processNumber: '0001' }]]));

    const items = await listAppointments('t1', { from: '2026-11-01', to: '2026-12-01' });

    expect(caseService.findSummariesByIds).toHaveBeenCalledWith('t1', ['p1', 'p-apagada']);
    expect(items.map((item) => item.caseNumber)).toEqual(['0001', '0001', undefined]);
    expect(items[2]).not.toHaveProperty('caseNumber');
  });
});
