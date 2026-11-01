import { describe, expect, it, vi } from 'vitest';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { DatajudUnavailableError } from '../../providers/datajudClient.js';
import * as caseService from '../case/case.service.js';
import * as opportunityRepository from './opportunity.repository.js';
import { convertOpportunity, searchDatajud } from './opportunity.service.js';

vi.mock('./opportunity.repository.js', () => ({
  findIdsByNumeros: vi.fn(),
  findById: vi.fn(),
  updateOpportunity: vi.fn(),
}));
vi.mock('../case/case.service.js', () => ({ createCase: vi.fn() }));

const process = { processNumber: '0001234-56.2026.5.02.0001', court: 'trt2' as const, subjects: [] };

describe('opportunity.service', () => {
  it('sem chave do Datajud a busca responde datajud_not_configured', async () => {
    await expect(searchDatajud(undefined, 't1', { court: 'trt2' })).rejects.toMatchObject({
      message: 'datajud_not_configured',
      status: 503,
    });
  });

  it('marca os resultados que já são oportunidade e traduz falha do Datajud em 503', async () => {
    vi.mocked(opportunityRepository.findIdsByNumeros).mockResolvedValue(new Map([[process.processNumber, 'o1']]));
    const client = { search: vi.fn().mockResolvedValue({ items: [process] }) };

    const result = await searchDatajud(client, 't1', { court: 'trt2' });
    expect(result.items[0]?.opportunityId).toBe('o1');

    client.search.mockRejectedValue(new DatajudUnavailableError(429));
    const error = await searchDatajud(client, 't1', { court: 'trt2' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CustomError);
    expect(error).toMatchObject({ message: 'datajud_unavailable', status: 503 });
  });

  it('converter cria a perícia com os dados do processo e marca a oportunidade como convertida', async () => {
    vi.mocked(opportunityRepository.findById).mockResolvedValue({
      ...process,
      id: 'o1',
      courtUnit: '1ª Vara do Trabalho',
      status: 'under_review',
    } as never);
    vi.mocked(caseService.createCase).mockResolvedValue({ id: 'p1' } as never);

    const result = await convertOpportunity('t1', 'o1', {
      courtType: 'labor',
      role: 'court_expert',
      subject: 'Ruído',
    });

    expect(result).toEqual({ caseId: 'p1' });
    expect(caseService.createCase).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: 't1', court: 'TRT2', division: '1ª Vara do Trabalho', opportunityId: 'o1' }),
    );
    expect(opportunityRepository.updateOpportunity).toHaveBeenCalledWith('t1', 'o1', {
      status: 'converted',
      caseId: 'p1',
    });
  });
});
