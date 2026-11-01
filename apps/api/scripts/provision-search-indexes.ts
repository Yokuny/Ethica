import { connect, disconnect, provisionSearchIndexes } from '@ethica/db';
import { env } from '../src/config/env.config.js';

// ENR-13.7 (AD-054): creates/updates the Atlas Search indexes (customer and
// product). A search index is not a Mongoose index: `syncIndexes` does not cover it,
// and the definition lives in packages/db/src/textSearch.ts (SEARCH_INDEXES).
// Idempotent — running again changes nothing. The database is the one from the environment's
// MONGODB_URI, which has to be MongoDB Atlas: the local compose container in dev, the
// hosted cluster in production (single pattern, AD-059).
//
//   pnpm --filter api run search:provision
const run = async (): Promise<void> => {
  await connect(env.MONGODB_URI);
  try {
    const indexes = await provisionSearchIndexes();
    console.log(JSON.stringify({ event: 'search_indexes.provisioned', indexes }));
    if (indexes.some((index) => !index.ready)) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'search_indexes.failed',
        message: (error as Error).message,
        hint: 'O MONGODB_URI precisa apontar para um MongoDB Atlas (Atlas Search): o container mongo do compose em dev, o cluster hospedado em produção.',
      }),
    );
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
};

void run();
