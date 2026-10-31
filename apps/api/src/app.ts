import { respObj } from '@ethica/contracts';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import nodemailer from 'nodemailer';
import { register } from 'prom-client';
import { env } from './config/env.config.js';
import { registerAllSubscribers } from './events/index.js';
import { createAuthMiddleware } from './middlewares/authentication.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { responseTime } from './middlewares/responseTime.middleware.js';
import { createAgendaRouter } from './modules/agenda/compromisso.router.js';
import { createFinanceiroRouter } from './modules/financeiro/lancamento.router.js';
import { createAccountRouter } from './modules/identity/account.router.js';
import { buildAuthDeps } from './modules/identity/auth.deps.js';
import { createAuthRouter } from './modules/identity/auth.router.js';
import { inviteRouter } from './modules/identity/invite.router.js';
import { createPlatformRouter } from './modules/identity/platform.router.js';
import { createPreferencesRouter } from './modules/identity/preferences.router.js';
import { createTenantInviteRouter } from './modules/identity/tenantInvite.router.js';
import { createParteRouter } from './modules/pericia/parte.router.js';
import { createPericiaRouter } from './modules/pericia/pericia.router.js';
import { createProspeccaoRouter } from './modules/prospeccao/oportunidade.router.js';
import { createDatajudClient, type DatajudClient } from './providers/datajudClient.js';
import type { MailProvider } from './providers/mail/index.js';
import { createLogMailProvider } from './providers/mail/log.mailProvider.js';
import { createNodemailerMailProvider } from './providers/mail/nodemailer.mailProvider.js';

// Compartilhado com server.ts (aviso diário de prazos, AD-110).
export const buildMailProvider = (): MailProvider => {
  if (env.MAIL_PROVIDER === 'nodemailer') {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    return createNodemailerMailProvider(transport, env.SMTP_FROM ?? '');
  }
  return createLogMailProvider();
};

// Sem .listen() — testável via supertest sem abrir porta. start() (server.ts)
// é quem efetivamente sobe o processo. `datajud` é injetável para os testes.
export const buildApp = (options: { datajud?: DatajudClient } = {}): Express => {
  // Idempotente — vários buildApp() no mesmo processo (testes) não duplicam handler.
  registerAllSubscribers();

  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(responseTime);

  const { validToken } = createAuthMiddleware(buildAuthDeps());
  const mailProvider = buildMailProvider();
  const inviteBaseUrl = `${env.CORS_ORIGIN}/invite`;
  const datajud =
    options.datajud ??
    (env.DATAJUD_API_KEY
      ? createDatajudClient({ baseUrl: env.DATAJUD_BASE_URL, apiKey: env.DATAJUD_API_KEY })
      : undefined);

  app.get('/health', (_req, res) => {
    res.json(respObj({ data: { service: 'api' } }));
  });

  // Sem validToken (mesmo padrão de /health): métricas Prometheus de request e banco.
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    // res.end (não res.send): res.send() reordena os parâmetros do Content-Type.
    res.end(await register.metrics());
  });

  app.use('/platform', createPlatformRouter({ validToken, mailProvider, inviteBaseUrl }));
  app.use('/tenant', createTenantInviteRouter({ validToken, mailProvider, inviteBaseUrl }));
  app.use('/invites', inviteRouter);
  app.use('/auth', createAuthRouter({ validToken }));
  app.use('/me', createPreferencesRouter({ validToken }));
  app.use('/me', createAccountRouter({ validToken }));
  app.use('/pericias', createPericiaRouter({ validToken }));
  app.use('/partes', createParteRouter({ validToken }));
  app.use('/agenda', createAgendaRouter({ validToken }));
  app.use('/financeiro', createFinanceiroRouter({ validToken }));
  app.use('/prospeccao', createProspeccaoRouter({ validToken, datajud }));

  app.use(errorHandler);

  return app;
};
