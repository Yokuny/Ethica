import { describe, expect, it, vi } from 'vitest';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { DatajudUnavailableError } from '../../providers/datajudClient.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as oportunidadeRepository from './oportunidade.repository.js';
import { converterOportunidade, searchDatajud } from './oportunidade.service.js';

vi.mock('./oportunidade.repository.js', () => ({
  findIdsByNumeros: vi.fn(),
  findById: vi.fn(),
  updateOportunidade: vi.fn(),
}));
vi.mock('../pericia/pericia.service.js', () => ({ createPericia: vi.fn() }));

const processo = { numeroProcesso: '0001234-56.2026.5.02.0001', tribunal: 'trt2' as const, assuntos: [] };

describe('oportunidade.service', () => {
  it('sem chave do Datajud a busca responde datajud_not_configured', async () => {
    await expect(searchDatajud(undefined, 't1', { tribunal: 'trt2' })).rejects.toMatchObject({
      message: 'datajud_not_configured',
      status: 503,
    });
  });

  it('marca os resultados que já são oportunidade e traduz falha do Datajud em 503', async () => {
    vi.mocked(oportunidadeRepository.findIdsByNumeros).mockResolvedValue(new Map([[processo.numeroProcesso, 'o1']]));
    const client = { search: vi.fn().mockResolvedValue({ items: [processo] }) };

    const result = await searchDatajud(client, 't1', { tribunal: 'trt2' });
    expect(result.items[0]?.oportunidadeId).toBe('o1');

    client.search.mockRejectedValue(new DatajudUnavailableError(429));
    const error = await searchDatajud(client, 't1', { tribunal: 'trt2' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CustomError);
    expect(error).toMatchObject({ message: 'datajud_unavailable', status: 503 });
  });

  it('converter cria a perícia com os dados do processo e marca a oportunidade como convertida', async () => {
    vi.mocked(oportunidadeRepository.findById).mockResolvedValue({
      ...processo,
      id: 'o1',
      orgaoJulgador: '1ª Vara do Trabalho',
      status: 'em_analise',
    } as never);
    vi.mocked(periciaService.createPericia).mockResolvedValue({ id: 'p1' } as never);

    const result = await converterOportunidade('t1', 'o1', {
      justica: 'trabalhista',
      papel: 'perito',
      objeto: 'Ruído',
    });

    expect(result).toEqual({ periciaId: 'p1' });
    expect(periciaService.createPericia).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: 't1', tribunal: 'TRT2', vara: '1ª Vara do Trabalho', oportunidadeId: 'o1' }),
    );
    expect(oportunidadeRepository.updateOportunidade).toHaveBeenCalledWith('t1', 'o1', {
      status: 'convertida',
      periciaId: 'p1',
    });
  });
});
