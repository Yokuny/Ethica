import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Valores de fallback para apps/api/src/config/env.config.ts, cujo `env` é
// validado no IMPORT do módulo (fail-fast). Sem isso, qualquer teste que
// importe (direta ou transitivamente) esse módulo falharia na coleta, já que o
// processo do Vitest não carrega o .env real.
const apiBaseEnv = {
  NODE_ENV: 'test',
  API_PORT: '18080',
  SESSION_JWT_SECRET: 'test-secret',
  CORS_ORIGIN: 'http://localhost:15173',
  MAIL_PROVIDER: 'log',
};

// unit/structural não conectam no banco: a MONGODB_URI só precisa passar no parse do env.
const apiTestEnv = { ...apiBaseEnv, MONGODB_URI: 'mongodb://localhost:37017/ethica_test?directConnection=true' };

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        // apps/web usa o alias '@' -> './src' (apps/web/vite.config.ts). Este
        // vitest.config.ts roda a partir da raiz do monorepo e não herda o
        // vite.config.ts de apps/web, então o mesmo alias é repetido aqui.
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
          // Sem MONGODB_URI de propósito: o globalSetup injeta a do banco de testes.
          env: apiBaseEnv,
          // Todos os arquivos de integração e e2e compartilham UM banco de testes.
          // Rodar os arquivos em paralelo faz o afterEach/afterAll de um arquivo
          // (deleteMany global) apagar dados que outro arquivo, em execução
          // concorrente, acabou de escrever — falso 401/403 intermitente. Por isso `fileParallelism: false`
          // aqui e `groupOrder` abaixo: os projects de banco rodam um depois do
          // outro, nunca juntos.
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
          // Sem MONGODB_URI de propósito (ver "integration").
          env: apiBaseEnv,
          // Mesma razão do project "integration": o banco de testes é um só.
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
