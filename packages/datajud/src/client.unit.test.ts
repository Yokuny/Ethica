import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createDatajudClient, DatajudError, DatajudRetryableError, parseAnswer } from './client.js';

// Real answers of the Datajud (2026-11-22): packages/datajud/src/fixtures/.
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'));

describe('parseAnswer (Datajud, AD-271)', () => {
  it('lê o processo real do TRT24: número com máscara, grau, movimentos com chave e complementos', () => {
    const [process] = parseAnswer('TRT24', fixture('trt24-process-alvara.json'));
    expect(process).toMatchObject({ court: 'TRT24', degree: 'G1', filedAt: '2021-04-20' });
    expect(process?.courtUnitName).toBe('VARA DO TRABALHO DE BATAGUASSU');
    expect(process?.subjects).toEqual(['Contratuais', 'Reflexos', 'Redução/Supressão']);
    expect(process?.processNumber).toMatch(/^\d{7}-\d{2}\.\d{4}\.5\.24\.\d{4}$/);
    const alvara = process?.movements.find((movement) => movement.complements.some((item) => item.value === 73));
    expect(alvara).toMatchObject({ code: 60, name: 'Expedição de documento' });
    expect(alvara?.key).toMatch(/^[0-9a-f]{16}$/);
    // The same movement always gets the same key.
    expect(parseAnswer('TRT24', fixture('trt24-process-alvara.json'))[0]?.movements[0]?.key).toBe(
      process?.movements[0]?.key,
    );
  });

  it('processo sigiloso é descartado', () => {
    const answer = fixture('trt24-process-alvara.json');
    answer.hits.hits[0]._source.nivelSigilo = 1;
    expect(parseAnswer('TRT24', answer)).toEqual([]);
  });

  it('resposta parcial (shard recusado) é falha que se tenta de novo, não "nenhum processo"', () => {
    expect(() => parseAnswer('TRT2', fixture('trt2-partial-shards.json'))).toThrow(DatajudRetryableError);
  });
});

describe('createDatajudClient', () => {
  const client = (fetchImpl: typeof fetch) =>
    createDatajudClient({ apiKey: 'k', baseUrl: 'https://datajud', minIntervalMs: 0, fetchImpl });

  it('consulta o lote pelos dígitos do número no índice do tribunal', async () => {
    const fetchImpl = vi.fn(async () => Response.json(fixture('trt24-batch-by-number.json')));
    const processes = await client(fetchImpl as unknown as typeof fetch).fetchProcesses('TRT24', [
      '0024898-29.2026.5.24.0081',
    ]);
    expect(processes.length).toBe(4);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://datajud/api_publica_trt24/_search');
    expect(JSON.parse(String(init.body)).query).toEqual({ terms: { numeroProcesso: ['00248982920265240081'] } });
  });

  it('429 e 5xx tentam de novo; 400 não', async () => {
    const answer = (status: number) => vi.fn(async () => Response.json(fixture('trt2-rejected-429.json'), { status }));
    await expect(client(answer(429) as unknown as typeof fetch).fetchProcesses('TRT2', ['x'])).rejects.toThrow(
      DatajudRetryableError,
    );
    await expect(client(answer(504) as unknown as typeof fetch).fetchProcesses('TJMS', ['x'])).rejects.toThrow(
      DatajudRetryableError,
    );
    await expect(client(answer(400) as unknown as typeof fetch).fetchProcesses('TRT2', ['x'])).rejects.toThrow(
      DatajudError,
    );
  });

  // Diagnosis of the failures (AD-287): one `datajud.request` line per call, with what tells the cause apart.
  describe('diagnóstico (AD-287)', () => {
    const lines = (spy: { mock: { calls: unknown[][] } }): Record<string, unknown>[] =>
      spy.mock.calls
        .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
        .filter((line) => line.event === 'datajud.request');

    it('429: resultado, cabeçalhos de limite, corpo da recusa, ritmo e a chave sem expô-la', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const fetchImpl = vi.fn(
        async () =>
          new Response('{"message":"API rate limit exceeded"}', {
            status: 429,
            headers: { 'Retry-After': '120', 'X-RateLimit-Remaining-Minute': '0', Via: 'kong/3.4', 'Set-Cookie': 'x' },
          }),
      );
      const datajud = client(fetchImpl as unknown as typeof fetch);
      await expect(datajud.fetchProcesses('TRT16', ['a', 'a'])).rejects.toThrow(DatajudRetryableError);
      await expect(datajud.fetchProcesses('TRT16', ['a'])).rejects.toThrow(DatajudRetryableError);
      const [first, second] = lines(error);
      expect(first).toMatchObject({
        court: 'TRT16',
        index: 'api_publica_trt16',
        outcome: 'rate_limited',
        status: 429,
        numbers: 1,
        size: 4,
        body: '{"message":"API rate limit exceeded"}',
        headers: { 'retry-after': '120', 'x-ratelimit-remaining-minute': '0', via: 'kong/3.4' },
        lastMinute: 0,
      });
      expect((first?.headers as Record<string, string> | undefined)?.['set-cookie']).toBeUndefined();
      expect(first.keyId).toMatch(/^[0-9a-f]{8}$/);
      expect(JSON.stringify(first)).not.toContain('APIKey');
      expect(second).toMatchObject({ lastMinute: 1, lastHour: 1 });
      expect(second.courtGapMs).toBeGreaterThanOrEqual(0);
      error.mockRestore();
    });

    it('429 real do Elasticsearch: fila de busca do cluster cheia (fixture do TRT2)', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const fetchImpl = vi.fn(async () => Response.json(fixture('trt2-rejected-429.json'), { status: 429 }));
      await expect(client(fetchImpl as unknown as typeof fetch).fetchProcesses('TRT2', ['a'])).rejects.toThrow(
        DatajudRetryableError,
      );
      expect(lines(error)[0]).toMatchObject({
        outcome: 'rate_limited',
        errorTypes: expect.stringContaining('es_rejected_execution_exception'),
        node: expect.stringMatching(/^instance-\d+$/),
        poolSize: 10,
        activeThreads: 10,
        queuedTasks: 1000,
        queueCapacity: 1000,
      });
      error.mockRestore();
    });

    it('resposta parcial traz a carga do shard recusado', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const fetchImpl = vi.fn(async () => Response.json(fixture('trt2-partial-shards.json')));
      await expect(client(fetchImpl as unknown as typeof fetch).fetchProcesses('TRT2', ['a'])).rejects.toThrow(
        DatajudRetryableError,
      );
      expect(lines(error)[0]).toMatchObject({
        outcome: 'partial',
        shards: { total: 5, failed: 1 },
        errorTypes: expect.stringContaining('es_rejected_execution_exception'),
      });
      error.mockRestore();
    });

    it('401/403 é chave recusada e não se tenta de novo', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const fetchImpl = vi.fn(async () => new Response('forbidden', { status: 403 }));
      await expect(client(fetchImpl as unknown as typeof fetch).fetchProcesses('TRT2', ['a'])).rejects.toThrow(
        DatajudError,
      );
      expect(lines(error)[0]).toMatchObject({ outcome: 'auth', status: 403 });
      error.mockRestore();
    });

    it('tempo esgotado e erro de rede saem separados, com o código do erro', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const timeout = vi.fn(async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      });
      const reset = vi.fn(async () => {
        throw new TypeError('fetch failed', {
          cause: Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
        });
      });
      await expect(client(timeout as unknown as typeof fetch).fetchProcesses('TRT4', ['a'])).rejects.toThrow(
        DatajudRetryableError,
      );
      await expect(client(reset as unknown as typeof fetch).fetchProcesses('TRT4', ['a'])).rejects.toThrow(
        DatajudRetryableError,
      );
      expect(lines(error)).toEqual([
        expect.objectContaining({ outcome: 'timeout', errorName: 'TimeoutError' }),
        expect.objectContaining({ outcome: 'network', errorCode: 'ECONNRESET', cause: 'socket hang up' }),
      ]);
      error.mockRestore();
    });

    it('busca cortada pelo tempo (timed_out) volta para a fila, nunca vira "não encontrado"', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const fetchImpl = vi.fn(async () =>
        Response.json({ timed_out: true, _shards: { failed: 0 }, hits: { hits: [] } }),
      );
      await expect(client(fetchImpl as unknown as typeof fetch).fetchProcesses('TRT2', ['a'])).rejects.toThrow(
        DatajudRetryableError,
      );
      expect(lines(error)[0]).toMatchObject({ outcome: 'partial', timedOut: true });
      error.mockRestore();
    });

    it('sucesso conta encontrados, faltantes, sigilosos e lote truncado', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.mockClear();
      const answer = fixture('trt24-batch-by-number.json');
      answer.hits.total = { value: 99, relation: 'eq' };
      const fetchImpl = vi.fn(async () => Response.json(answer));
      await client(fetchImpl as unknown as typeof fetch).fetchProcesses('TRT24', [
        '0024898-29.2026.5.24.0081',
        '0000001-00.2026.5.24.0001',
      ]);
      expect(lines(log)[0]).toMatchObject({
        outcome: 'ok',
        status: 200,
        numbers: 2,
        hits: 4,
        total: 99,
        truncated: true,
        missing: 1,
      });
      log.mockRestore();
    });
  });
});
