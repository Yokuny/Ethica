import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { connect, syncIndexes } from '@ethica/db';
import { buildApp, buildMailProvider } from './app.js';
import { env } from './config/env.config.js';
import { nextExecution, sendDeadlineNotices } from './modules/agenda/deadlineReminder.service.js';

// Aviso diário de prazos às 07:00 de São Paulo (AD-110). Timer em memória, encadeado: cada
// execução agenda a próxima. Uma réplica da API por ambiente (design.md, Risks).
const scheduleDeadlineNotices = (): void => {
  const deps = { mail: buildMailProvider(), appUrl: env.CORS_ORIGIN };
  const schedule = () => {
    const delay = nextExecution(new Date()).getTime() - Date.now();
    setTimeout(async () => {
      try {
        const { sent } = await sendDeadlineNotices(deps);
        console.log(JSON.stringify({ event: 'deadline_notice.sent', sent }));
      } catch (e) {
        console.error(
          JSON.stringify({ event: 'deadline_notice.failed', message: e instanceof Error ? e.message : String(e) }),
        );
      }
      schedule();
    }, delay).unref();
  };
  schedule();
};

// `opts` existe só pra permitir que o teste injete uma porta efêmera (0).
export type StartOptions = { port?: number };

export type StartHandle = { httpServer: Server };

// env → connect → syncIndexes → listen, com catch explícito: Mongo
// indisponível nunca deixa o processo de pé aceitando tráfego.
export const start = async (opts: StartOptions = {}): Promise<StartHandle | undefined> => {
  try {
    await connect(env.MONGODB_URI);
    await syncIndexes();

    const port = opts.port ?? Number(env.API_PORT);
    const httpServer = buildApp().listen(port, () => {
      console.log(JSON.stringify({ event: 'server.listening', port }));
    });
    scheduleDeadlineNotices();
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
