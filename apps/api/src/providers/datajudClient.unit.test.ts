import { describe, expect, it, vi } from 'vitest';
import { buildDatajudQuery, createDatajudClient, DatajudUnavailableError, formatCnjNumber } from './datajudClient.js';

const hit = (numero: string, sort: number) => ({
  _source: {
    numeroProcesso: numero,
    classe: { nome: 'Ação Trabalhista - Rito Ordinário' },
    assuntos: [[{ nome: 'Insalubridade' }], { nome: 'Periculosidade' }],
    orgaoJulgador: { nome: '1ª Vara do Trabalho de São Paulo' },
    dataAjuizamento: '2026-05-10T00:00:00.000Z',
    movimentos: [
      { nome: 'Distribuição', dataHora: '2026-05-10T10:00:00.000Z' },
      { nome: 'Nomeado perito', dataHora: '2026-08-01T14:00:00.000Z' },
    ],
  },
  sort: [sort],
});

describe('formatCnjNumber', () => {
  it('aplica a máscara do CNJ aos 20 dígitos e devolve como veio quando não são 20', () => {
    expect(formatCnjNumber('00012345620265020001')).toBe('0001234-56.2026.5.02.0001');
    expect(formatCnjNumber('123')).toBe('123');
  });
});

describe('buildDatajudQuery', () => {
  it('sem termo nem órgão busca tudo, ordenado do mais recente', () => {
    expect(buildDatajudQuery({ court: 'trt2' })).toEqual({
      size: 20,
      query: { match_all: {} },
      sort: [{ '@timestamp': { order: 'desc' } }],
    });
  });

  it('termo vira multi_match nos movimentos/assuntos/classe e o cursor vira search_after', () => {
    const body = buildDatajudQuery({
      court: 'trt2',
      termo: 'perito',
      orgaoJulgador: '1ª Vara',
      size: 5,
      cursor: [9],
    });
    expect(body.query).toEqual({
      bool: {
        must: [
          { multi_match: { query: 'perito', fields: ['movimentos.nome', 'assuntos.nome', 'classe.nome'] } },
          { match: { 'orgaoJulgador.nome': '1ª Vara' } },
        ],
      },
    });
    expect(body.size).toBe(5);
    expect(body.search_after).toEqual([9]);
  });
});

describe('createDatajudClient', () => {
  it('chama o índice do tribunal com a APIKey e mapeia o processo com o último movimento', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ hits: { hits: [hit('00012345620265020001', 1)] } }), { status: 200 }),
      );
    const client = createDatajudClient({ baseUrl: 'https://datajud.test', apiKey: 'k', fetchImpl });

    const result = await client.search({ court: 'trt2', termo: 'perito', size: 1 });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://datajud.test/api_publica_trt2/_search');
    expect((init.headers as Record<string, string>).Authorization).toBe('APIKey k');
    expect(result.items[0]).toMatchObject({
      processNumber: '0001234-56.2026.5.02.0001',
      court: 'trt2',
      assuntos: ['Insalubridade', 'Periculosidade'],
      lastMovement: 'Nomeado perito',
    });
    // Página cheia: devolve o cursor para a próxima.
    expect(result.cursor).toEqual([1]);
  });

  it('resposta de erro ou falha de rede vira DatajudUnavailableError', async () => {
    const failing = createDatajudClient({
      baseUrl: 'https://datajud.test',
      apiKey: 'k',
      fetchImpl: vi.fn().mockResolvedValue(new Response('{}', { status: 429 })),
    });
    await expect(failing.search({ court: 'trt2' })).rejects.toBeInstanceOf(DatajudUnavailableError);

    const offline = createDatajudClient({
      baseUrl: 'https://datajud.test',
      apiKey: 'k',
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('fetch failed')),
    });
    await expect(offline.search({ court: 'trt2' })).rejects.toBeInstanceOf(DatajudUnavailableError);
  });
});
