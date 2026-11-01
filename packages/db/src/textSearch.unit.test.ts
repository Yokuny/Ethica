import { describe, expect, it } from 'vitest';
import {
  caseSearchStages,
  isSearchUnavailableError,
  SEARCH_INDEXES,
  searchDefinitionMatches,
  TextSearchUnavailableError,
  withSearch,
} from './textSearch.js';

const ID = '0123456789abcdef01234567';
const stageOf = (stages: unknown[]) =>
  (stages[0] as { $search: { index: string; compound: Record<string, unknown> } }).$search;

describe('periciaSearchStages (montagem do $search)', () => {
  it('o filtro de tenant vai DENTRO do $search, como ObjectId, e é o primeiro estágio', () => {
    const stages = caseSearchStages(ID, { q: 'unhealthyConditions' });
    expect(Object.keys(stages[0] as object)).toEqual(['$search']);
    const filter = (stageOf(stages).compound.filter as { equals: { path: string; value: unknown } }[])[0];
    expect(filter?.equals.path).toBe('Tenant');
    expect(String(filter?.equals.value)).toBe(ID);
    expect(typeof filter?.equals.value).toBe('object');
  });

  it('cada palavra é uma cláusula must (E), buscando em qualquer campo de texto (OU)', () => {
    const must = stageOf(caseSearchStages(ID, { q: 'ruído   metalúrgica' })).compound.must as {
      compound: { should: { autocomplete: { query: string; path: string } }[]; minimumShouldMatch: number };
    }[];
    expect(must).toHaveLength(2);
    expect(must[0]?.compound.should.map((c) => c.autocomplete.path)).toEqual([
      'processNumber',
      'subject',
      'division',
      'district',
      'parties.name',
    ]);
    expect(must[0]?.compound.minimumShouldMatch).toBe(1);
    expect(must[1]?.compound.should[0]?.autocomplete.query).toBe('metalúrgica');
  });

  it('palavra acima do máximo do índice é cortada para não sumir do resultado', () => {
    const must = stageOf(caseSearchStages(ID, { q: 'a'.repeat(40) })).compound.must as {
      compound: { should: { autocomplete: { query: string } }[] };
    }[];
    expect(must[0]?.compound.should[0]?.autocomplete.query).toHaveLength(15);
  });

  it('os índices declarados cobrem perícias e partes', () => {
    expect(SEARCH_INDEXES.map((index) => index.collection)).toEqual(['cases', 'parties']);
  });

  it('o $search nunca usa regex nem $text', () => {
    const json = JSON.stringify(caseSearchStages(ID, { q: 'x' }));
    expect(json).not.toMatch(/regex|\$text/);
  });
});

describe('searchDefinitionMatches (definição normalizada pelo Atlas)', () => {
  const [legalCase] = SEARCH_INDEXES;
  const wanted = legalCase.definition;
  const ac = { type: 'autocomplete', minGrams: 1, maxGrams: 15, foldDiacritics: true, tokenization: 'nGram' };
  // O que o Atlas devolve: chaves reordenadas e defaults acrescentados.
  const normalized = {
    mappings: {
      fields: {
        district: { ...ac },
        division: { ...ac },
        parties: { fields: { name: { ...ac } }, type: 'document', dynamic: false },
        subject: { ...ac },
        processNumber: { ...ac },
        Tenant: { type: 'objectId' },
      },
      dynamic: false,
    },
  };

  it('aceita a definição normalizada como igual', () => {
    expect(searchDefinitionMatches(normalized, wanted)).toBe(true);
  });

  it('detecta valor alterado, campo faltando e campo sobrando', () => {
    const changed = structuredClone(normalized);
    changed.mappings.fields.subject.minGrams = 2;
    expect(searchDefinitionMatches(changed, wanted)).toBe(false);

    const { subject: _subject, ...withoutSubject } = normalized.mappings.fields;
    expect(searchDefinitionMatches({ mappings: { ...normalized.mappings, fields: withoutSubject } }, wanted)).toBe(
      false,
    );

    const extra = { mappings: { ...normalized.mappings, fields: { ...normalized.mappings.fields, x: { ...ac } } } };
    expect(searchDefinitionMatches(extra, wanted)).toBe(false);
  });
});

describe('isSearchUnavailableError / withSearch', () => {
  it.each([
    [{ code: 40324, message: "Unrecognized pipeline stage name: '$search'" }],
    [{ code: 31082, message: 'x' }],
    [{ message: 'Error connecting to Search Index Management service.' }],
    [{ message: '$search stage is only allowed on MongoDB Atlas' }],
    [new Error('$search is not allowed in this deployment')],
    [new Error("Unrecognized pipeline stage name: '$search'")],
  ])('reconhece %j', (error) => {
    expect(isSearchUnavailableError(error)).toBe(true);
  });

  it.each([
    [{ code: 11000, message: 'duplicate key' }],
    [new Error('timeout')],
    [new Error('Unknown argument to $search: foo')],
    [null],
    ['x'],
  ])('não confunde outro erro (%j)', (error) => {
    expect(isSearchUnavailableError(error)).toBe(false);
  });

  it('withSearch troca só o erro de ambiente pelo tipado e repassa o resto', async () => {
    await expect(withSearch(async () => Promise.reject({ code: 40324, message: 'x' }))).rejects.toBeInstanceOf(
      TextSearchUnavailableError,
    );
    const other = new Error('boom');
    await expect(withSearch(async () => Promise.reject(other))).rejects.toBe(other);
    await expect(withSearch(async () => 42)).resolves.toBe(42);
  });
});
