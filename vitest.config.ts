import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Fallback values for apps/api/src/config/env.config.ts, whose `env` is
// validated on module IMPORT (fail-fast). Without it, any test that
// imports that module (directly or transitively) would fail at collection, since the
// Vitest process does not load the real .env.
const apiBaseEnv = {
  NODE_ENV: 'test',
  API_PORT: '18080',
  SESSION_JWT_SECRET: 'test-secret',
  CORS_ORIGIN: 'http://localhost:15173',
  MAIL_PROVIDER: 'log',
};

// unit/structural do not connect to the database: MONGODB_URI only needs to pass the env parse.
const apiTestEnv = { ...apiBaseEnv, MONGODB_URI: 'mongodb://localhost:37017/ethica_test?directConnection=true' };

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        // apps/web usa o alias '@' -> './src' (apps/web/vite.config.ts). Este
        // vitest.config.ts runs from the monorepo root and does not inherit the
        // apps/web vite.config.ts, so the same alias is repeated here.
        resolve: {
          alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
        },
        test: {
          name: 'unit',
          include: ['packages/**/*.unit.test.ts', 'apps/*/src/**/*.unit.test.ts', 'apps/*/src/**/*.unit.test.tsx'],
          passWithNoTests: true,
          env: apiTestEnv,
        },
      },
      {
        test: {
          name: 'integration',
          include: [
            'packages/db/src/**/*.int.test.ts',
            'apps/api/src/**/*.int.test.ts',
            'apps/api/tests/**/*.int.test.ts',
          ],
          passWithNoTests: true,
          globalSetup: ['packages/db/tests/setup/globalSetup.ts'],
          // No MONGODB_URI on purpose: globalSetup injects the test database one.
          env: apiBaseEnv,
          // All integration and e2e files share ONE test database.
          // Running the files in parallel would make one file's afterEach/afterAll
          // (global deleteMany) would delete data that another file, running
          // concurrently, just wrote — intermittent false 401/403. That is why `fileParallelism: false`
          // here and `groupOrder` below: the database projects run one after the
          // other, never together.
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['apps/*/src/**/*.e2e.test.ts'],
          passWithNoTests: true,
          globalSetup: ['packages/db/tests/setup/globalSetup.ts'],
          // No MONGODB_URI on purpose (see "integration").
          env: apiBaseEnv,
          // Same reason as the "integration" project: there is a single test database.
          fileParallelism: false,
          sequence: { groupOrder: 2 },
        },
      },
      {
        resolve: {
          alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
        },
        test: {
          name: 'structural',
          include: ['tests/structural/*.structural.test.ts'],
          passWithNoTests: true,
          env: apiTestEnv,
        },
      },
    ],
  },
});
