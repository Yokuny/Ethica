import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createDatajudClient, DatajudError, DatajudRetryableError, parseAnswer } from './client.js';

// Real answers of the Datajud (2026-11-22): apps/worker/src/datajud/fixtures/.
const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'));

describe('parseAnswer (Datajud, AD-271)', () => {
  it('lê o processo real do TRT24: número com máscara, grau, movimentos com chave e complementos', () => {
    const [process] = parseAnswer('TRT24', fixture('trt24-process-alvara.json'));
    expect(process).toMatchObject({ court: 'TRT24', degree: 'G1' });
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
});
