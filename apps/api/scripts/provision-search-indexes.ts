import { connect, disconnect, provisionSearchIndexes } from '@ethica/db';
import { env } from '../src/config/env.config.js';

// ENR-13.7 (AD-054): cria/atualiza os índices do Atlas Search (cliente e
// produto). Índice de busca não é índice Mongoose: o `syncIndexes` não o cobre,
// e a definição vive em packages/db/src/textSearch.ts (SEARCH_INDEXES).
// Idempotente — rodar de novo não muda nada. A base é a do MONGODB_URI do
// ambiente, que precisa ser MongoDB Atlas: o container local do compose em dev, o
// cluster hospedado em produção (padrão único, AD-059).
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
