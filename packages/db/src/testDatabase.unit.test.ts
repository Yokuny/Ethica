import { describe, expect, it } from 'vitest';
import { resolveTestDatabaseUri, wipeTestDatabase } from './testDatabase.js';

const SRV = 'mongodb+srv://user:pw@cluster-teste.abc12.mongodb.net/crm_test?retryWrites=true';

describe('resolveTestDatabaseUri (guardas do banco de testes)', () => {
  it('devolve a URI quando o banco tem "test" no nome', () => {
    expect(resolveTestDatabaseUri({ MONGODB_TEST_URI: SRV })).toBe(SRV);
    expect(resolveTestDatabaseUri({ MONGODB_TEST_URI: 'mongodb://h1:27017,h2:27017/Meu_TEST_db' })).toContain(
      'Meu_TEST_db',
    );
  });

  it('explica o que falta quando não há como definir o banco de testes', () => {
    expect(() => resolveTestDatabaseUri({})).toThrow(/Banco de testes indefinido/);
    expect(() => resolveTestDatabaseUri({ MONGODB_TEST_URI: '' })).toThrow(/indefinido/);
  });

  it('deriva <banco>_test da MONGODB_URI local, preservando a query', () => {
    expect(resolveTestDatabaseUri({ MONGODB_URI: 'mongodb://localhost:37017/crm?directConnection=true' })).toBe(
      'mongodb://localhost:37017/crm_test?directConnection=true',
    );
    expect(resolveTestDatabaseUri({ MONGODB_URI: 'mongodb://mongo:27017/crm' })).toBe('mongodb://mongo:27017/crm_test');
  });

  it('o override MONGODB_TEST_URI vence a derivação', () => {
    expect(resolveTestDatabaseUri({ MONGODB_TEST_URI: SRV, MONGODB_URI: 'mongodb://localhost:37017/crm' })).toBe(SRV);
  });

  it.each([
    ['+srv', 'mongodb+srv://u:p@cluster.abc12.mongodb.net/crm'],
    ['host remoto', 'mongodb://db.exemplo.com:27017/crm'],
    ['sem banco', 'mongodb://localhost:37017/?directConnection=true'],
  ])('não deriva de MONGODB_URI %s', (_name, uri) => {
    expect(() => resolveTestDatabaseUri({ MONGODB_URI: uri })).toThrow(/indefinido/);
  });

  it.each([
    ['sem "test" no nome do banco', 'mongodb+srv://u:p@cluster.abc12.mongodb.net/crm'],
    ['sem nome de banco', 'mongodb+srv://u:p@cluster.abc12.mongodb.net/?retryWrites=true'],
    ['sem barra nem banco', 'mongodb+srv://u:p@cluster.abc12.mongodb.net'],
    ['"test" só no host, não no banco', 'mongodb+srv://u:p@cluster-test.abc12.mongodb.net/crm'],
  ])('recusa URI %s (os testes apagam documentos)', (_name, uri) => {
    expect(() => resolveTestDatabaseUri({ MONGODB_TEST_URI: uri })).toThrow(/recusada/);
  });

  it('recusa a URI que é o mesmo host e banco da MONGODB_URI do app', () => {
    const env = {
      MONGODB_TEST_URI: SRV,
      MONGODB_URI: 'mongodb+srv://outro:pw@CLUSTER-TESTE.abc12.mongodb.net/crm_test',
    };
    expect(() => resolveTestDatabaseUri(env)).toThrow(/mesmo host e banco/);
  });

  it('aceita quando o app aponta para outro cluster ou outro banco', () => {
    expect(
      resolveTestDatabaseUri({
        MONGODB_TEST_URI: SRV,
        MONGODB_URI: 'mongodb+srv://u:p@cluster-dev.xyz.mongodb.net/crm',
      }),
    ).toBe(SRV);
    expect(
      resolveTestDatabaseUri({
        MONGODB_TEST_URI: SRV,
        MONGODB_URI: 'mongodb+srv://u:p@cluster-teste.abc12.mongodb.net/crm',
      }),
    ).toBe(SRV);
  });
});

describe('wipeTestDatabase', () => {
  it('recusa apagar quando não há conexão com banco de teste', async () => {
    // Without an open connection the database name is empty: it never deletes blindly.
    await expect(wipeTestDatabase()).rejects.toThrow(/recusado/);
  });
});
