import { afterAll, afterEach, beforeAll } from 'vitest';
import { connect, disconnect } from '../../src/connection.js';
import { wipeTestDatabase } from '../../src/testDatabase.js';

// Removes every document from the registered collections, without dropping
// structure/indexes (including the search ones). Refuses to delete outside a test database.
export const clearCollections = wipeTestDatabase;

// Call it at the top of the describe: connects to the test database (MONGODB_URI injected by
// globalSetup), clears collections between tests and disconnects at the end of the suite.
export const useTestDb = (): void => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await clearCollections();
  });

  afterAll(async () => {
    await disconnect();
  });
};
