import mongoose from 'mongoose';

// ENR-13.7 (AD-054): text search through MongoDB Atlas Search (`$search`), never
// `$text` or `$regex`. Everything that builds or runs `$search` lives here; the
// repositories only ask for "the stages that restrict to these records".
//
// Fatos conferidos contra o Atlas Search:
// - `autocomplete` with nGram tokenization (minGrams 1) keeps the "contains"
//   behavior for whoever types in the middle of the word, ignoring accents;
// - a query with several words is OR by default; to become AND, each
//   word becomes a `must` clause;
// - the query term is cut at `maxGrams` as a precaution (in the tests a
//   word longer than that still matches; the cut only avoids depending on it);
// - `$search` with a missing index returns empty WITHOUT an error (that is why
//   provisioning reports the state of the indexes).

// Aggregate stage ready for `Model.aggregate` (Mongoose does not type `$search` separately).
export type SearchStage = mongoose.PipelineStage;

// Free text of the search box: all the words, in any of the case text fields.
export type CaseSearchSpec = { q: string };
// Search box of the party registry: name, CPF/CNPJ or OAB.
export type PartySearchSpec = { q: string };

// Database without Atlas Search (misconfigured environment): the API answers
// `search_unavailable` instead of falling back to regex (ENR-13.7).
export class TextSearchUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Atlas Search indisponível');
    this.name = 'TextSearchUnavailableError';
    if (cause !== undefined) this.cause = cause;
  }
}

// `$search` on a plain mongod: "Unrecognized pipeline stage name" (40324) or a
// connection error to mongot / the index service (31082). The message covers
// variations across versions and providers.
const SEARCH_UNAVAILABLE_CODES = new Set([40324, 31082]);
export const isSearchUnavailableError = (error: unknown): boolean => {
  const e = error as { code?: number; message?: string } | null;
  if (!e || typeof e !== 'object') return false;
  if (typeof e.code === 'number' && SEARCH_UNAVAILABLE_CODES.has(e.code)) return true;
  // Only ENVIRONMENT messages: a `$search` malformed by a bug of ours cannot
  // become "unavailable" and hide the failure.
  return /unrecognized pipeline stage name: '?\$search|\$search is not (enabled|allowed|supported)|\$search stage is only allowed|mongot|search index management|SearchNotEnabled/i.test(
    e.message ?? '',
  );
};

// Runs a query that uses `$search`, turning an environment failure into a typed error.
export const withSearch = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isSearchUnavailableError(error)) throw new TextSearchUnavailableError(error);
    throw error;
  }
};

// Tenant and values matched in an aggregate are NOT converted by Mongoose
// (unlike `find`): the ObjectId has to be explicit.
export const toObjectId = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);
export const newObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// --- Indexes (versioned here, provisioned by script) -------------------------
export const CASE_SEARCH_INDEX = 'case_text';
const MAX_GRAMS = 15;

const autocomplete = {
  type: 'autocomplete',
  tokenization: 'nGram',
  minGrams: 1,
  maxGrams: MAX_GRAMS,
  foldDiacritics: true,
};

// Fields the case listing search box covers. `parties.name` is the copy of the
// party registry name kept on the case (AD-117).
const CASE_SEARCH_PATHS = ['processNumber', 'subject', 'division', 'district', 'parties.name'] as const;
export const PARTY_SEARCH_INDEX = 'party_text';
const PARTY_SEARCH_PATHS = ['name', 'document', 'oab'] as const;

export const SEARCH_INDEXES = [
  {
    collection: 'cases',
    name: CASE_SEARCH_INDEX,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          Tenant: { type: 'objectId' },
          processNumber: autocomplete,
          subject: autocomplete,
          division: autocomplete,
          district: autocomplete,
          parties: { type: 'document', fields: { name: autocomplete } },
        },
      },
    },
  },
  {
    collection: 'parties',
    name: PARTY_SEARCH_INDEX,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          Tenant: { type: 'objectId' },
          ...Object.fromEntries(PARTY_SEARCH_PATHS.map((path) => [path, autocomplete])),
        },
      },
    },
  },
] as const;

// --- Atlas implementation -----------------------------------------------------
const words = (q: string): string[] =>
  q
    .split(/\s+/)
    .map((word) => word.slice(0, MAX_GRAMS))
    .filter(Boolean);

const tenantFilter = (tenantId: string) => ({ equals: { path: 'Tenant', value: toObjectId(tenantId) } });

const searchStage = (spec: Record<string, unknown>): SearchStage => ({ $search: spec }) as unknown as SearchStage;

// Each word has to show up in one of the fields (AND between words, OR between fields).
export const caseSearchStages = (tenantId: string, spec: CaseSearchSpec): SearchStage[] => [
  searchStage({
    index: CASE_SEARCH_INDEX,
    compound: {
      filter: [tenantFilter(tenantId)],
      must: words(spec.q).map((word) => ({
        compound: {
          should: CASE_SEARCH_PATHS.map((path) => ({ autocomplete: { query: word, path } })),
          minimumShouldMatch: 1,
        },
      })),
    },
  }),
];

export const partySearchStages = (tenantId: string, spec: PartySearchSpec): SearchStage[] => [
  searchStage({
    index: PARTY_SEARCH_INDEX,
    compound: {
      filter: [tenantFilter(tenantId)],
      must: words(spec.q).map((word) => ({
        compound: {
          should: PARTY_SEARCH_PATHS.map((path) => ({ autocomplete: { query: word, path } })),
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
// Native driver (no models): provisioning also runs in the test setup and in
// scripts, where loading the models just to find the collection name would be pointless coupling.
const collectionOf = (name: string) => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('provisionSearchIndexes: sem conexão com o banco.');
  return db.collection(name);
};

const listIndex = async (collection: string, name: string): Promise<ListedSearchIndex | undefined> =>
  ((await collectionOf(collection).listSearchIndexes(name).toArray()) as unknown as ListedSearchIndex[]).find(
    (index) => index.name === name,
  );

// Atlas returns the NORMALIZED definition (reorders keys, adds defaults
// like `fields: {}`, `store`, `norms`), so comparing by JSON would always find a
// difference and rewrite the index on every run. What matters is that everything
// our definition asks for is there; and, in the `fields` mappings, that no
// field we stopped asking for is left over.
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

// Idempotent: creates what is missing, updates what differs, and waits until it is ready.
// A search index is not a Mongoose index (`syncIndexes` does not cover it): it needs
// a real Atlas Search and takes a few seconds to become queryable.
export const provisionSearchIndexes = async (options: { timeoutMs?: number } = {}): Promise<SearchIndexStatus[]> => {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const results: SearchIndexStatus[] = [];

  for (const { collection, name, definition } of SEARCH_INDEXES) {
    try {
      await mongoose.connection.db?.createCollection(collection);
    } catch {
      // already exists
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
