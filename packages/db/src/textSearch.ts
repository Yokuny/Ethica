import mongoose from 'mongoose';

// ENR-13.7 (AD-054): busca de texto por MongoDB Atlas Search (`$search`), nunca
// `$text` nem `$regex`. Tudo que monta ou executa `$search` mora aqui; os
// repositórios só pedem "os estágios que restringem a estes registros".
//
// Fatos conferidos contra o Atlas Search:
// - `autocomplete` com tokenização nGram (minGrams 1) preserva o comportamento
//   de "contém" de quem digita no meio da palavra, com acento ignorado;
// - uma consulta com várias palavras é OR por padrão; para ficar E, cada
//   palavra vira uma cláusula `must`;
// - o termo da consulta é cortado em `maxGrams` por precaução (nos testes uma
//   palavra maior que isso ainda casa; o corte só evita depender disso);
// - `$search` com índice inexistente devolve vazio SEM erro (por isso o
//   provisionamento reporta o estado dos índices).

// Estágio de aggregate pronto para o `Model.aggregate` (o Mongoose não tipa `$search` à parte).
export type SearchStage = mongoose.PipelineStage;

// Texto livre da caixa de busca: todas as palavras, em qualquer dos campos de texto da perícia.
export type PericiaSearchSpec = { q: string };
// Caixa de busca do cadastro de partes: nome, CPF/CNPJ ou OAB.
export type ParteSearchSpec = { q: string };

// Banco sem Atlas Search (ambiente mal configurado): a API responde
// `search_unavailable` em vez de cair em regex (ENR-13.7).
export class TextSearchUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Atlas Search indisponível');
    this.name = 'TextSearchUnavailableError';
    if (cause !== undefined) this.cause = cause;
  }
}

// `$search` num mongod comum: "Unrecognized pipeline stage name" (40324) ou erro
// de conexão com o mongot / serviço de índices (31082). A mensagem cobre
// variações entre versões e provedores.
const SEARCH_UNAVAILABLE_CODES = new Set([40324, 31082]);
export const isSearchUnavailableError = (error: unknown): boolean => {
  const e = error as { code?: number; message?: string } | null;
  if (!e || typeof e !== 'object') return false;
  if (typeof e.code === 'number' && SEARCH_UNAVAILABLE_CODES.has(e.code)) return true;
  // Só mensagens de AMBIENTE: um `$search` malformado por bug nosso não pode
  // virar "indisponível" e esconder a falha.
  return /unrecognized pipeline stage name: '?\$search|\$search is not (enabled|allowed|supported)|\$search stage is only allowed|mongot|search index management|SearchNotEnabled/i.test(
    e.message ?? '',
  );
};

// Executa uma consulta que usa `$search` convertendo a falha de ambiente em erro tipado.
export const withSearch = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isSearchUnavailableError(error)) throw new TextSearchUnavailableError(error);
    throw error;
  }
};

// Tenant e valores casados em aggregate NÃO são convertidos pelo Mongoose
// (diferente de `find`): o ObjectId precisa ser explícito.
export const toObjectId = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);
export const newObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// --- Índices (versionados aqui, provisionados por script) --------------------
export const PERICIA_SEARCH_INDEX = 'pericia_text';
const MAX_GRAMS = 15;

const autocomplete = {
  type: 'autocomplete',
  tokenization: 'nGram',
  minGrams: 1,
  maxGrams: MAX_GRAMS,
  foldDiacritics: true,
};

// Campos que a caixa de busca da listagem de perícias cobre. `partes.nome` é a cópia do
// nome do cadastro de partes guardada na perícia (AD-117).
const PERICIA_SEARCH_PATHS = ['numeroProcesso', 'objeto', 'vara', 'comarca', 'partes.nome'] as const;
export const PARTE_SEARCH_INDEX = 'parte_text';
const PARTE_SEARCH_PATHS = ['nome', 'documento', 'oab'] as const;

export const SEARCH_INDEXES = [
  {
    collection: 'pericias',
    name: PERICIA_SEARCH_INDEX,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          Tenant: { type: 'objectId' },
          numeroProcesso: autocomplete,
          objeto: autocomplete,
          vara: autocomplete,
          comarca: autocomplete,
          partes: { type: 'document', fields: { nome: autocomplete } },
        },
      },
    },
  },
  {
    collection: 'partes',
    name: PARTE_SEARCH_INDEX,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          Tenant: { type: 'objectId' },
          ...Object.fromEntries(PARTE_SEARCH_PATHS.map((path) => [path, autocomplete])),
        },
      },
    },
  },
] as const;

// --- Implementação Atlas ------------------------------------------------------
const words = (q: string): string[] =>
  q
    .split(/\s+/)
    .map((word) => word.slice(0, MAX_GRAMS))
    .filter(Boolean);

const tenantFilter = (tenantId: string) => ({ equals: { path: 'Tenant', value: toObjectId(tenantId) } });

const searchStage = (spec: Record<string, unknown>): SearchStage => ({ $search: spec }) as unknown as SearchStage;

// Cada palavra precisa aparecer em algum dos campos (E entre palavras, OU entre campos).
export const periciaSearchStages = (tenantId: string, spec: PericiaSearchSpec): SearchStage[] => [
  searchStage({
    index: PERICIA_SEARCH_INDEX,
    compound: {
      filter: [tenantFilter(tenantId)],
      must: words(spec.q).map((word) => ({
        compound: {
          should: PERICIA_SEARCH_PATHS.map((path) => ({ autocomplete: { query: word, path } })),
          minimumShouldMatch: 1,
        },
      })),
    },
  }),
];

export const parteSearchStages = (tenantId: string, spec: ParteSearchSpec): SearchStage[] => [
  searchStage({
    index: PARTE_SEARCH_INDEX,
    compound: {
      filter: [tenantFilter(tenantId)],
      must: words(spec.q).map((word) => ({
        compound: {
          should: PARTE_SEARCH_PATHS.map((path) => ({ autocomplete: { query: word, path } })),
          minimumShouldMatch: 1,
        },
      })),
    },
  }),
];

// --- Provisionamento ---------------------------------------------------------
export type SearchIndexStatus = {
  name: string;
  action: 'created' | 'updated' | 'unchanged';
  ready: boolean;
};

type ListedSearchIndex = {
  name: string;
  status?: string;
  queryable?: boolean;
  latestDefinition?: unknown;
};
// Driver nativo (sem models): o provisionamento roda também no setup dos testes e em
// scripts, onde carregar os models só para achar o nome da collection seria acoplamento à toa.
const collectionOf = (name: string) => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('provisionSearchIndexes: sem conexão com o banco.');
  return db.collection(name);
};

const listIndex = async (collection: string, name: string): Promise<ListedSearchIndex | undefined> =>
  ((await collectionOf(collection).listSearchIndexes(name).toArray()) as unknown as ListedSearchIndex[]).find(
    (index) => index.name === name,
  );

// O Atlas devolve a definição NORMALIZADA (reordena chaves, acrescenta defaults
// como `fields: {}`, `store`, `norms`), então comparar por JSON sempre acharia
// diferença e reescreveria o índice a cada rodada. O que importa é que tudo o
// que a nossa definição pede esteja lá; e, nos mapeamentos de `fields`, que não
// sobre campo que deixamos de pedir.
const covers = (stored: unknown, wanted: unknown, key?: string): boolean => {
  if (Array.isArray(wanted)) {
    return (
      Array.isArray(stored) &&
      stored.length === wanted.length &&
      wanted.every((item) => stored.some((candidate) => covers(candidate, item)))
    );
  }
  if (wanted && typeof wanted === 'object') {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return false;
    const have = stored as Record<string, unknown>;
    const want = wanted as Record<string, unknown>;
    if (key === 'fields' && Object.keys(have).sort().join() !== Object.keys(want).sort().join()) return false;
    return Object.entries(want).every(([k, v]) => covers(have[k], v, k));
  }
  return stored === wanted;
};
export const searchDefinitionMatches = (stored: unknown, wanted: unknown): boolean => covers(stored, wanted);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Idempotente: cria o que falta, atualiza o que difere, e espera ficar pronto.
// Um índice de busca não é índice Mongoose (`syncIndexes` não o cobre): precisa
// de um Atlas Search de verdade e leva alguns segundos para ficar consultável.
export const provisionSearchIndexes = async (options: { timeoutMs?: number } = {}): Promise<SearchIndexStatus[]> => {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const results: SearchIndexStatus[] = [];

  for (const { collection, name, definition } of SEARCH_INDEXES) {
    try {
      await mongoose.connection.db?.createCollection(collection);
    } catch {
      // já existe
    }
    const existing = await listIndex(collection, name);
    let action: SearchIndexStatus['action'] = 'unchanged';
    if (!existing) {
      await collectionOf(collection).createSearchIndex({ name, definition });
      action = 'created';
    } else if (!searchDefinitionMatches(existing.latestDefinition, definition)) {
      await collectionOf(collection).updateSearchIndex(name, definition);
      action = 'updated';
    }

    const deadline = Date.now() + timeoutMs;
    let ready = false;
    while (Date.now() < deadline) {
      const index = await listIndex(collection, name);
      if (index?.queryable && index.status === 'READY') {
        ready = true;
        break;
      }
      await wait(500);
    }
    results.push({ name, action, ready });
  }
  return results;
};
