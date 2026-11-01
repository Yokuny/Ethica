import type { DatajudCourt, DatajudSearch, DatajudTechnicalSubject } from '@ethica/contracts';

// API Pública do Datajud (CNJ): um índice Elasticsearch por tribunal em
// `${baseUrl}/api_publica_<tribunal>/_search`, autenticado por
// `Authorization: APIKey <chave>`. Só leitura; nenhum dado do tenant sai daqui.
export type DatajudProcess = {
  processNumber: string;
  court: DatajudCourt;
  caseClass?: string;
  subjects: string[];
  courtUnit?: string;
  filingDate?: string;
  lastMovement?: string;
  lastMovementAt?: string;
  atualizadoEm?: string;
};

export type DatajudSearchResult = { items: DatajudProcess[]; cursor?: (string | number)[] };

export type DatajudClient = { search: (query: DatajudSearch) => Promise<DatajudSearchResult> };

export class DatajudUnavailableError extends Error {
  constructor(readonly status?: number) {
    super(`Datajud indisponível${status ? ` (${status})` : ''}`);
    this.name = 'DatajudUnavailableError';
  }
}

type Named = { nome?: string };
type DatajudSource = {
  numeroProcesso?: string;
  classe?: Named;
  // Alguns tribunais devolvem assuntos aninhados em listas.
  assuntos?: Array<Named | Named[]>;
  orgaoJulgador?: Named;
  dataAjuizamento?: string;
  dataHoraUltimaAtualizacao?: string;
  movimentos?: Array<Named & { dataHora?: string }>;
};
type DatajudHit = { _source?: DatajudSource; sort?: (string | number)[] };

const DEFAULT_SIZE = 20;
const DEFAULT_TIMEOUT_MS = 30_000;

// O Datajud guarda o número só com dígitos; a tela e o cadastro usam a máscara do CNJ.
export const formatCnjNumber = (digits: string): string => {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 20) return digits;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
};

// Nome do assunto processual como o Datajud o indexa (a API do Ethica fala as chaves em inglês, AD-113).
const SUBJECT_IN_DATAJUD: Record<DatajudTechnicalSubject, string> = {
  unhealthy_conditions: 'Insalubridade',
  hazardous_conditions: 'Periculosidade',
  work_accident: 'Acidente de trabalho',
};

export const buildDatajudQuery = (query: DatajudSearch): Record<string, unknown> => {
  const must: Record<string, unknown>[] = [];
  if (query.termo) {
    must.push({ multi_match: { query: query.termo, fields: ['movimentos.nome', 'assuntos.nome', 'classe.nome'] } });
  }
  if (query.technicalSubjects?.length) {
    must.push({
      bool: {
        should: query.technicalSubjects.map((assunto) => ({
          match: { 'assuntos.nome': { query: SUBJECT_IN_DATAJUD[assunto], operator: 'and' } },
        })),
        minimum_should_match: 1,
      },
    });
  }
  if (query.courtUnit) must.push({ match: { 'orgaoJulgador.nome': query.courtUnit } });
  if (query.processNumber) must.push({ match: { numeroProcesso: query.processNumber.replace(/\D/g, '') } });
  if (query.caseClassCode) must.push({ match: { 'classe.codigo': query.caseClassCode } });
  if (query.courtUnitCode) must.push({ match: { 'orgaoJulgador.codigo': query.courtUnitCode } });
  return {
    size: query.size ?? DEFAULT_SIZE,
    query: must.length ? { bool: { must } } : { match_all: {} },
    sort: [{ '@timestamp': { order: 'desc' } }],
    ...(query.cursor ? { search_after: query.cursor } : {}),
  };
};

export const toProcess = (court: DatajudCourt, source: DatajudSource): DatajudProcess => {
  const ultimo = [...(source.movimentos ?? [])]
    .filter((movimento) => movimento.dataHora)
    .sort((a, b) => (b.dataHora as string).localeCompare(a.dataHora as string))[0];
  return {
    processNumber: formatCnjNumber(source.numeroProcesso ?? ''),
    court,
    caseClass: source.classe?.nome,
    subjects: (source.assuntos ?? []).flat().flatMap((assunto) => (assunto.nome ? [assunto.nome] : [])),
    courtUnit: source.orgaoJulgador?.nome,
    filingDate: source.dataAjuizamento,
    lastMovement: ultimo?.nome,
    lastMovementAt: ultimo?.dataHora,
    atualizadoEm: source.dataHoraUltimaAtualizacao,
  };
};

export const createDatajudClient = (options: {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): DatajudClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    search: async (query) => {
      let response: Response;
      try {
        response = await fetchImpl(`${options.baseUrl}/api_publica_${query.court}/_search`, {
          method: 'POST',
          headers: { Authorization: `APIKey ${options.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildDatajudQuery(query)),
          signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        });
      } catch {
        throw new DatajudUnavailableError();
      }
      if (!response.ok) throw new DatajudUnavailableError(response.status);
      const body = (await response.json()) as { hits?: { hits?: DatajudHit[] } };
      const hits = body.hits?.hits ?? [];
      const last = hits.at(-1);
      return {
        items: hits.flatMap((hit) => (hit._source?.numeroProcesso ? [toProcess(query.court, hit._source)] : [])),
        cursor: hits.length === (query.size ?? DEFAULT_SIZE) ? last?.sort : undefined,
      };
    },
  };
};
