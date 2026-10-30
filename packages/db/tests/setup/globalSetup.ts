import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connect, disconnect } from '../../src/connection.js';
import { resolveTestDatabaseUri, wipeTestDatabase } from '../../src/testDatabase.js';
import { provisionSearchIndexes } from '../../src/textSearch.js';

// Roda uma vez por project de banco (integration e e2e), no mesmo processo: resolve o banco de
// testes (RUN_BOOK.md#banco-de-dados), injeta-o como MONGODB_URI nos workers, garante os
// índices de busca e parte de um banco limpo.
const ROOT_ENV = fileURLToPath(new URL('../../../../.env', import.meta.url));

// A segunda passada já encontra a MONGODB_URI trocada pela de teste; este marcador (no
// ambiente, que persiste) guarda a URI original do app para derivar e comparar.
const APP_URI_MARK = 'ETHICA_TEST_DB_APP_URI';

export default async function setup(): Promise<() => Promise<void>> {
  if (!process.env.MONGODB_TEST_URI && !process.env.MONGODB_URI) {
    try {
      process.loadEnvFile(path.resolve(ROOT_ENV));
    } catch {
      // sem .env: resolveTestDatabaseUri explica o que falta
    }
  }
  const appUri = process.env[APP_URI_MARK] ?? process.env.MONGODB_URI;
  if (appUri) process.env[APP_URI_MARK] = appUri;
  const testUri = resolveTestDatabaseUri({ ...process.env, MONGODB_URI: appUri });
  process.env.MONGODB_URI = testUri;

  await connect(testUri);
  const indexes = await provisionSearchIndexes();
  const notReady = indexes.filter((index) => !index.ready).map((index) => index.name);
  if (notReady.length > 0)
    throw new Error(`Índices de busca não ficaram prontos no banco de teste: ${notReady.join(', ')}`);
  await wipeTestDatabase();

  return async () => {
    // Os dois projects dividem a conexão do processo: o segundo teardown já a encontra fechada.
    if (mongoose.connection.readyState !== 1) return;
    await wipeTestDatabase();
    await disconnect();
  };
}
