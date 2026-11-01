import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connect, disconnect } from '../../src/connection.js';
import { resolveTestDatabaseUri, wipeTestDatabase } from '../../src/testDatabase.js';
import { provisionSearchIndexes } from '../../src/textSearch.js';

// Runs once per database project (integration and e2e), in the same process: resolves the test
// database (RUN_BOOK.md#banco-de-dados), injects it as MONGODB_URI into the workers, ensures the
// search indexes and starts from a clean database.
const ROOT_ENV = fileURLToPath(new URL('../../../../.env', import.meta.url));

// The second pass already finds MONGODB_URI swapped for the test one; this marker (in the
// environment, which persists) keeps the app's original URI to derive and compare.
const APP_URI_MARK = 'ETHICA_TEST_DB_APP_URI';

export default async function setup(): Promise<() => Promise<void>> {
  if (!process.env.MONGODB_TEST_URI && !process.env.MONGODB_URI) {
    try {
      process.loadEnvFile(path.resolve(ROOT_ENV));
    } catch {
      // no .env: resolveTestDatabaseUri explains what is missing
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
    // Both projects share the process connection: the second teardown already finds it closed.
    if (mongoose.connection.readyState !== 1) return;
    await wipeTestDatabase();
    await disconnect();
  };
}
