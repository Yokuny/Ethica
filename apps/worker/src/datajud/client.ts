import { createHash } from 'node:crypto';
import { type CourtMovement, cnjDigits, datajudIndexOf, formatCnjNumber } from '@ethica/contracts';

// Datajud Public API (CNJ) for the worker (worker plan, section 6; AD-271). One Elasticsearch index per court;
// a batch of numbers per query (`terms` on `numeroProcesso`, checked in 2026-11-22). Failures the queue
// retries with backoff: timeout, 429, 5xx and a partial answer (`_shards.failed`, which is NOT "no process").

export class DatajudRetryableError extends Error {}
export class DatajudError extends Error {}

export type CourtProcessData = {
  court: string;
  processNumber: string;
  degree: string;
  className?: string;
  courtUnitName?: string;
  sourceUpdatedAt?: string;
  movements: CourtMovement[];
};

type Complement = { codigo?: number; descricao?: string; valor?: number; nome?: string };
type Source = {
  numeroProcesso?: string;
  grau?: string;
  nivelSigilo?: number;
  classe?: { nome?: string };
  orgaoJulgador?: { nome?: string };
  dataHoraUltimaAtualizacao?: string;
  movimentos?: { codigo?: number; nome?: string; dataHora?: string; complementosTabelados?: Complement[] }[];
};
type Answer = { _shards?: { failed?: number }; hits?: { hits?: { _source?: Source }[] } };

// The Datajud gives no movement id: the key is the code, the instant and the complements.
const movementKey = (code: number, at: string, complements: Complement[]): string =>
  createHash('sha1')
    .update(`${code}|${at}|${JSON.stringify(complements)}`)
    .digest('hex')
    .slice(0, 16);

// A secret process (`nivelSigilo > 0`) is dropped here and never saved nor logged.
export const parseAnswer = (court: string, answer: Answer): CourtProcessData[] => {
  if ((answer._shards?.failed ?? 0) > 0) throw new DatajudRetryableError(`resposta parcial do ${court}`);
  return (answer.hits?.hits ?? []).flatMap(({ _source: source }) => {
    if (!source?.numeroProcesso || (source.nivelSigilo ?? 0) > 0) return [];
    return [
      {
        court,
        processNumber: formatCnjNumber(source.numeroProcesso),
        degree: source.grau ?? 'G1',
        className: source.classe?.nome,
        courtUnitName: source.orgaoJulgador?.nome,
        sourceUpdatedAt: source.dataHoraUltimaAtualizacao,
        movements: (source.movimentos ?? []).flatMap((movement) => {
          if (movement.codigo === undefined || !movement.dataHora) return [];
          const complements = movement.complementosTabelados ?? [];
          return [
            {
              key: movementKey(movement.codigo, movement.dataHora, complements),
              code: movement.codigo,
              name: movement.nome ?? '',
              at: movement.dataHora,
              complements: complements.map((item) => ({
                code: item.codigo,
                description: item.descricao,
                value: item.valor,
                name: item.nome,
              })),
            },
          ];
        }),
      },
    ];
  });
};

export type DatajudClient = { fetchProcesses: (court: string, numbers: string[]) => Promise<CourtProcessData[]> };

export const createDatajudClient = (options: {
  apiKey: string;
  baseUrl: string;
  minIntervalMs: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): DatajudClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  let last = 0;
  return {
    fetchProcesses: async (court, numbers) => {
      // Rate limit: the public API is shared and often overloaded.
      const wait = last + options.minIntervalMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      last = Date.now();
      let response: Response;
      try {
        response = await fetchImpl(`${options.baseUrl}/${datajudIndexOf(court)}/_search`, {
          method: 'POST',
          headers: { Authorization: `APIKey ${options.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            size: numbers.length * 4,
            query: { terms: { numeroProcesso: numbers.map(cnjDigits) } },
          }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
        });
      } catch (e) {
        throw new DatajudRetryableError(e instanceof Error ? e.message : String(e));
      }
      if (response.status === 429 || response.status >= 500) {
        throw new DatajudRetryableError(`${court} respondeu ${response.status}`);
      }
      if (!response.ok) throw new DatajudError(`${court} respondeu ${response.status}`);
      return parseAnswer(court, (await response.json()) as Answer);
    },
  };
};
