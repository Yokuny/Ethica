import { afterAll, afterEach, beforeAll } from 'vitest';
import { connect, disconnect } from '../../src/connection.js';
import { wipeTestDatabase } from '../../src/testDatabase.js';

// Remove todos os documentos das collections já registradas, sem dropar
// estrutura/índices (inclusive os de busca). Recusa apagar fora de um banco de teste.
export const clearCollections = wipeTestDatabase;

// Chame no topo do describe: conecta ao banco de testes (MONGODB_URI injetada pelo
// globalSetup), limpa collections entre testes e desconecta ao final da suíte.
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
