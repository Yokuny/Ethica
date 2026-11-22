import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  backfillCalendarEntries,
  connect,
  migrateCases,
  migrateUsers,
  provisionSearchIndexes,
  syncIndexes,
} from '@ethica/db';
import { buildApp } from './app.js';
import { env } from './config/env.config.js';
// `opts` only exists so the test can inject an ephemeral port (0).
export type StartOptions = { port?: number };

export type StartHandle = { httpServer: Server };

// Atlas Search indexes (AD-054) follow `SEARCH_INDEXES` on every boot (AD-191): a field added to the search
// (the OS, AD-185) works without a manual step. In the background, so the boot does not wait for the index to
// be ready; a database without Atlas Search only logs.
const provisionSearch = (): void => {
  provisionSearchIndexes()
    .then((indexes) => console.log(JSON.stringify({ event: 'search_indexes.provisioned', indexes })))
    .catch((error: unknown) =>
      console.error(
        JSON.stringify({
          event: 'search_indexes.failed',
          message: error instanceof Error ? error.message : String(error),
        }),
      ),
    );
};

// env → connect → syncIndexes → data conversion (RSV-03, AEV-05, CNT-05) → listen; the reminders are the
// worker's (AD-267), with an explicit catch: Mongo
// unavailable never leaves the process up accepting traffic.
export const start = async (opts: StartOptions = {}): Promise<StartHandle | undefined> => {
  try {
    await connect(env.MONGODB_URI);
    await syncIndexes();
    await migrateCases();
    await migrateUsers();
    await backfillCalendarEntries();
    provisionSearch();

    const port = opts.port ?? Number(env.API_PORT);
    const httpServer = buildApp().listen(port, () => {
      console.log(JSON.stringify({ event: 'server.listening', port }));
    });
    return { httpServer };
  } catch (e) {
    console.error(JSON.stringify({ event: 'server.boot_failed', message: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
    return undefined;
  }
};

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  void start();
}
