import { createHash } from 'node:crypto';
import { type CourtMovement, cnjDigits, datajudIndexOf, formatCnjNumber } from '@ethica/contracts';
import { Counter, Histogram } from 'prom-client';

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
  // Filing day as the court writes it (`dataAjuizamento` 20251106173840 → 2025-11-06, no time zone) and the names
  // of the subjects (`assuntos`): they fill the case by the number (SGD-06, SGD-07).
  filedAt?: string;
  subjects: string[];
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
  dataAjuizamento?: string;
  assuntos?: { nome?: string }[];
  dataHoraUltimaAtualizacao?: string;
  movimentos?: { codigo?: number; nome?: string; dataHora?: string; complementosTabelados?: Complement[] }[];
};
type Answer = {
  took?: number;
  timed_out?: boolean;
  _shards?: { total?: number; successful?: number; skipped?: number; failed?: number };
  hits?: { total?: { value?: number; relation?: string }; hits?: { _source?: Source }[] };
};

// The Datajud gives no movement id: the key is the code, the instant and the complements.
const movementKey = (code: number, at: string, complements: Complement[]): string =>
  createHash('sha1')
    .update(`${code}|${at}|${JSON.stringify(complements)}`)
    .digest('hex')
    .slice(0, 16);

// `dataAjuizamento` comes as 20251106173840 or as an ISO instant; the day as the court wrote it.
const filingDay = (value?: string): string | undefined => {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length >= 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : undefined;
};

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
        filedAt: filingDay(source.dataAjuizamento),
        subjects: (source.assuntos ?? []).flatMap((item) => (item.nome?.trim() ? [item.nome.trim()] : [])),
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

// A search that passes takes 32 to 38 s on an overloaded cluster and some died at 60 s (AD-303); stays under
// the 5-minute lease of the job.
export const DATAJUD_TIMEOUT_MS = 120_000;

export type DatajudClient = { fetchProcesses: (court: string, numbers: string[]) => Promise<CourtProcessData[]> };

// Diagnosis of the failures (AD-287): every call to the Datajud writes one `datajud.request` line and feeds the
// metrics, so the logs tell which limit answers 429 (IP, key, hour, pace, batch size) before choosing a fix.
export type DatajudOutcome =
  | 'ok'
  | 'rate_limited'
  | 'server_error'
  | 'auth'
  | 'client_error'
  | 'timeout'
  | 'network'
  | 'partial'
  | 'invalid_body';

const requests = new Counter({
  name: 'datajud_requests_total',
  help: 'Chamadas ao Datajud por tribunal e resultado',
  labelNames: ['court', 'outcome'],
});
const duration = new Histogram({
  name: 'datajud_request_duration_seconds',
  help: 'Tempo de resposta do Datajud por tribunal e resultado',
  labelNames: ['court', 'outcome'],
  buckets: [0.25, 0.5, 1, 2, 5, 10, 20, 40, 60],
});

// Headers that tell who refused and why: rate limit, retry, gateway or CDN in front of the Elasticsearch.
const DIAGNOSTIC_HEADER =
  /^(retry-after|x-?rate-?limit|ratelimit|server|via|x-kong|x-envoy|cf-|x-cache|x-request-id|x-amzn|date|content-type|content-length)/i;
const diagnosticHeaders = (headers: Headers): Record<string, string> =>
  Object.fromEntries([...headers.entries()].filter(([name]) => DIAGNOSTIC_HEADER.test(name)));

const outcomeOfStatus = (status: number): DatajudOutcome => {
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  if (status === 401 || status === 403) return 'auth';
  return 'client_error';
};

// The 429 seen so far (TRT2, 2026-11-22) is the Elasticsearch of the CNJ with its search queue full
// (`es_rejected_execution_exception`, 10 active threads, 1001 queued): the load of the cluster, not a limit on us.
// These numbers, read from the error text, tell an overloaded cluster from a gateway that refuses this IP or key.
const ELASTIC_LOAD = {
  node: /(instance-\d+)\/search/,
  poolSize: /pool size = (\d+)/,
  activeThreads: /active threads = (\d+)/,
  queuedTasks: /queued tasks = (\d+)/,
  queueCapacity: /queue capacity = (\d+)/,
  ewmaMs: /task execution EWMA = ([\d.]+)ms/,
};
export const elasticLoad = (text: string): Record<string, string | number> => {
  const load: Record<string, string | number> = {};
  for (const [name, pattern] of Object.entries(ELASTIC_LOAD)) {
    const value = text.match(pattern)?.[1];
    if (value !== undefined) load[name] = name === 'node' ? value : Number(value);
  }
  const types = [...new Set([...text.matchAll(/"type"\s*:\s*"([a-z_]+)"/g)].map((match) => match[1] as string))];
  if (types.length > 0) load.errorTypes = types.join(',');
  return load;
};

const errorCode = (e: unknown): string | undefined => {
  const code = (e as { code?: unknown; cause?: { code?: unknown } } | undefined)?.code;
  const causeCode = (e as { cause?: { code?: unknown } } | undefined)?.cause?.code;
  return typeof code === 'string' ? code : typeof causeCode === 'string' ? causeCode : undefined;
};

export const createDatajudClient = (options: {
  apiKey: string;
  baseUrl: string;
  minIntervalMs: number;
  timeoutMs?: number;
  instance?: string;
  fetchImpl?: typeof fetch;
}): DatajudClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  // Which key was used, without exposing it: the public key of the CNJ changes from time to time.
  const keyId = createHash('sha256').update(options.apiKey).digest('hex').slice(0, 8);
  let last = 0;
  let inFlight = 0;
  const lastByCourt = new Map<string, number>();
  const recent: number[] = [];
  return {
    fetchProcesses: async (court, numbers) => {
      // Rate limit: the public API is shared and often overloaded.
      const wait = last + options.minIntervalMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      const startedAt = Date.now();
      // Pace seen by the Datajud from this process: gap since the last call (any court, same court) and how
      // many calls in the last minute and hour.
      while (recent.length > 0 && (recent[0] as number) < startedAt - 3_600_000) recent.shift();
      const pace = {
        waitMs: Math.max(0, Math.round(wait)),
        gapMs: last ? startedAt - last : undefined,
        courtGapMs: lastByCourt.has(court) ? startedAt - (lastByCourt.get(court) as number) : undefined,
        lastMinute: recent.filter((at) => at >= startedAt - 60_000).length,
        lastHour: recent.length,
        inFlight,
      };
      last = startedAt;
      lastByCourt.set(court, startedAt);
      recent.push(startedAt);
      inFlight += 1;
      const index = datajudIndexOf(court);
      const unique = [...new Set(numbers)];
      const size = unique.length * 4;
      const report = (outcome: DatajudOutcome, extra: object = {}) => {
        const ms = Date.now() - startedAt;
        requests.inc({ court, outcome });
        duration.observe({ court, outcome }, ms / 1000);
        const line = JSON.stringify({
          event: 'datajud.request',
          court,
          index,
          outcome,
          durationMs: ms,
          numbers: unique.length,
          size,
          ...pace,
          instance: options.instance,
          keyId,
          ...extra,
        });
        if (outcome === 'ok') console.log(line);
        else console.error(line);
      };
      let response: Response;
      try {
        response = await fetchImpl(`${options.baseUrl}/${index}/_search`, {
          method: 'POST',
          headers: { Authorization: `APIKey ${options.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ size, query: { terms: { numeroProcesso: unique.map(cnjDigits) } } }),
          signal: AbortSignal.timeout(options.timeoutMs ?? DATAJUD_TIMEOUT_MS),
        });
      } catch (e) {
        const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
        report(timeout ? 'timeout' : 'network', {
          errorName: e instanceof Error ? e.name : undefined,
          errorCode: errorCode(e),
          message: e instanceof Error ? e.message : String(e),
          cause: e instanceof Error && e.cause instanceof Error ? e.cause.message : undefined,
        });
        throw new DatajudRetryableError(e instanceof Error ? e.message : String(e));
      } finally {
        inFlight -= 1;
      }
      const headers = diagnosticHeaders(response.headers);
      if (!response.ok) {
        const outcome = outcomeOfStatus(response.status);
        // The body says which layer refused (gateway message, Elasticsearch error); cut, it is not data of a case.
        const text = await response.text().catch(() => '');
        report(outcome, { status: response.status, headers, ...elasticLoad(text), body: text.slice(0, 300) });
        if (outcome === 'rate_limited' || outcome === 'server_error') {
          throw new DatajudRetryableError(`${court} respondeu ${response.status}`);
        }
        throw new DatajudError(`${court} respondeu ${response.status}`);
      }
      let answer: Answer;
      try {
        answer = (await response.json()) as Answer;
      } catch (e) {
        report('invalid_body', {
          status: response.status,
          headers,
          message: e instanceof Error ? e.message : String(e),
        });
        throw new DatajudRetryableError(`resposta ilegível do ${court}`);
      }
      const hits = answer.hits?.hits ?? [];
      const elastic = {
        status: response.status,
        headers,
        took: answer.took,
        timedOut: answer.timed_out,
        shards: answer._shards && {
          total: answer._shards.total,
          successful: answer._shards.successful,
          skipped: answer._shards.skipped,
          failed: answer._shards.failed,
        },
        hits: hits.length,
        total: answer.hits?.total?.value,
        // More hits than the size asked: some process of the batch may have been left out.
        truncated: (answer.hits?.total?.value ?? 0) > hits.length,
        secret: hits.filter((hit) => (hit._source?.nivelSigilo ?? 0) > 0).length,
      };
      // A partial answer (shard refused, search cut by time) is NOT "no process": retried, or a case would
      // read as not found by mistake.
      if ((answer._shards?.failed ?? 0) > 0 || answer.timed_out) {
        report('partial', { ...elastic, ...elasticLoad(JSON.stringify(answer._shards ?? {})) });
        throw new DatajudRetryableError(`resposta parcial do ${court}`);
      }
      const processes = parseAnswer(court, answer);
      const found = new Set(processes.map((process) => process.processNumber));
      report('ok', { ...elastic, found: found.size, missing: unique.filter((number) => !found.has(number)).length });
      return processes;
    },
  };
};

// Public IP the Datajud sees from this worker (AD-287): a block by IP shows as 429 only for this address.
// Never fails the job: without an answer, `ip` is absent.
export const lookupEgressIp = async (fetchImpl: typeof fetch = fetch): Promise<string | undefined> => {
  try {
    const response = await fetchImpl('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5_000) });
    return ((await response.json()) as { ip?: string }).ip;
  } catch {
    return undefined;
  }
};
