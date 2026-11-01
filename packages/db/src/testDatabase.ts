import mongoose from 'mongoose';

// Test database (RUN_BOOK.md#banco-de-dados): the MONGODB_URI database with a `_test` suffix, on the
// same server. The tests delete documents, so the database name must contain "test" and
// the URI can never be the app one. MONGODB_TEST_URI is an optional override.
export const TEST_DATABASE_ENV = 'MONGODB_TEST_URI';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'mongo']);

const databaseNameOf = (uri: string): string | undefined =>
  /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri)?.[1] || undefined;

const hostAndDatabaseOf = (uri: string): string => {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)\/?([^?]*)/.exec(uri);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : uri;
};

// Only derives from a local server (`mongodb://`, never `+srv`): the production URI never becomes
// a test database by accident.
const deriveFromAppUri = (appUri: string): string | undefined => {
  const match = /^(mongodb:\/\/(?:[^@/]*@)?([^/?:]+)(?::\d+)?\/)([^/?]+)(\?.*)?$/.exec(appUri);
  if (!match || !LOCAL_HOSTS.has(match[2].toLowerCase())) return undefined;
  const [, prefix, , database, query = ''] = match;
  return `${prefix}${/test/i.test(database) ? database : `${database}_test`}${query}`;
};

export const resolveTestDatabaseUri = (env: NodeJS.ProcessEnv = process.env): string => {
  const uri = env[TEST_DATABASE_ENV] || (env.MONGODB_URI ? deriveFromAppUri(env.MONGODB_URI) : undefined);
  if (!uri) {
    throw new Error(
      `Banco de testes indefinido: MONGODB_URI precisa ser um mongodb:// local com banco (ex.: .../crm) ou ${TEST_DATABASE_ENV} explícita (ver RUN_BOOK.md#banco-de-dados).`,
    );
  }
  const name = databaseNameOf(uri);
  if (!name || !/test/i.test(name)) {
    throw new Error(
      `${TEST_DATABASE_ENV} recusada: o nome do banco na URI ("${name ?? 'absent'}") precisa conter "test". ` +
        'Os testes apagam documentos de todas as collections.',
    );
  }
  const appUri = env.MONGODB_URI;
  if (appUri && hostAndDatabaseOf(appUri) === hostAndDatabaseOf(uri)) {
    throw new Error(`${TEST_DATABASE_ENV} recusada: é o mesmo host e banco da MONGODB_URI do app.`);
  }
  return uri;
};

// Second guard, on the connection itself: it only deletes if the connected database is a test one.
// Deletes the documents of ALL existing collections (not only of the loaded
// models), without dropping collections or indexes (including the search ones).
export const wipeTestDatabase = async (): Promise<void> => {
  const { name, db } = mongoose.connection;
  if (!db || !/test/i.test(name)) {
    throw new Error(`wipeTestDatabase recusado: o banco conectado ("${name}") não tem "test" no nome.`);
  }
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).filter(
    (collection) => !collection.name.startsWith('system.'),
  );
  await Promise.all(collections.map((collection) => db.collection(collection.name).deleteMany({})));
};
