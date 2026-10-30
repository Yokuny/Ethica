import mongoose from 'mongoose';

// Banco de testes (RUN_BOOK.md#banco-de-dados): o banco da MONGODB_URI com sufixo `_test`, no
// mesmo servidor. Os testes apagam documentos, então o nome do banco precisa conter "test" e
// a URI nunca pode ser a do app. MONGODB_TEST_URI é um override opcional.
export const TEST_DATABASE_ENV = 'MONGODB_TEST_URI';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'mongo']);

const databaseNameOf = (uri: string): string | undefined =>
  /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri)?.[1] || undefined;

const hostAndDatabaseOf = (uri: string): string => {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)\/?([^?]*)/.exec(uri);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : uri;
};

// Só deriva de servidor local (`mongodb://`, nunca `+srv`): a URI de produção jamais vira
// banco de teste por acidente.
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
      `${TEST_DATABASE_ENV} recusada: o nome do banco na URI ("${name ?? 'ausente'}") precisa conter "test". ` +
        'Os testes apagam documentos de todas as collections.',
    );
  }
  const appUri = env.MONGODB_URI;
  if (appUri && hostAndDatabaseOf(appUri) === hostAndDatabaseOf(uri)) {
    throw new Error(`${TEST_DATABASE_ENV} recusada: é o mesmo host e banco da MONGODB_URI do app.`);
  }
  return uri;
};

// Segunda guarda, na própria conexão: só apaga se o banco conectado é de teste.
// Apaga os documentos de TODAS as collections existentes (não só dos models
// carregados), sem dropar collections nem índices (inclusive os de busca).
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
