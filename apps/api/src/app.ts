import { respObj } from '@ethica/contracts';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import nodemailer from 'nodemailer';
import { register } from 'prom-client';
import { env } from './config/env.config.js';
import { registerAllSubscribers } from './events/index.js';
import { createActivityLogMiddleware } from './middlewares/activityLog.middleware.js';
import { createAuthMiddleware } from './middlewares/authentication.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { responseTime } from './middlewares/responseTime.middleware.js';
import { createAgendaRouter } from './modules/agenda/appointment.router.js';
import { createInspectionRouter } from './modules/agenda/inspection.router.js';
import { createCaseRouter } from './modules/case/case.router.js';
import { createPartyRouter } from './modules/case/party.router.js';
import { createDocumentsRouter } from './modules/documents/documents.router.js';
import { createReportRouter } from './modules/documents/report.router.js';
import { createFinanceRouter } from './modules/finance/transaction.router.js';
import { createAccountRouter } from './modules/identity/account.router.js';
import { createActivityLogRouter } from './modules/identity/activityLog.router.js';
import * as activityLogService from './modules/identity/activityLog.service.js';
import { buildAuthDeps } from './modules/identity/auth.deps.js';
import { createAuthRouter } from './modules/identity/auth.router.js';
import { inviteRouter } from './modules/identity/invite.router.js';
import { createOfficeRouter } from './modules/identity/office.router.js';
import { createPlatformRouter } from './modules/identity/platform.router.js';
import { createPreferencesRouter } from './modules/identity/preferences.router.js';
import { createTenantInviteRouter } from './modules/identity/tenantInvite.router.js';
import { createProspectingRouter } from './modules/prospecting/opportunity.router.js';
import { createDatajudClient, type DatajudClient } from './providers/datajudClient.js';
import { createS3FileStorage, type FileStorage } from './providers/fileStorage.js';
import { createNominatimGeocoder, type Geocoder } from './providers/geocoder.js';
import type { MailProvider } from './providers/mail/index.js';
import { createLogMailProvider } from './providers/mail/log.mailProvider.js';
import { createNodemailerMailProvider } from './providers/mail/nodemailer.mailProvider.js';
import { createChromiumPdfRenderer, type PdfRenderer } from './providers/pdfRenderer.js';

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
// é quem efetivamente sobe o processo. `datajud`, `pdf` e `storage` são injetáveis para os testes.
export const buildApp = (
  options: {
    datajud?: DatajudClient;
    pdf?: PdfRenderer;
    storage?: FileStorage | null;
    mail?: MailProvider;
    geocoder?: Geocoder;
  } = {},
): Express => {
  // Idempotente — vários buildApp() no mesmo processo (testes) não duplicam handler.
  registerAllSubscribers();

  const app = express();

  // Content-Disposition exposto: o web lê o nome do PDF/ZIP gerado (AD-119, AD-122).
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true, exposedHeaders: ['Content-Disposition'] }));
  app.use(cookieParser());
  // Seção de laudo com texto rico passa de 100 kB: 1 MB só em `/expert-reports`; o parser global
  // ignora o corpo já lido (AD-126).
  app.use('/expert-reports', express.json({ limit: '1mb' }));
  // Registro de vistoria com muitas funções e atividades (AD-130).
  app.use('/inspections', express.json({ limit: '1mb' }));
  app.use(express.json());
  app.use(responseTime);
  // Diário de bordo (AD-134): grava toda escrita bem-sucedida do tenant ao fim da resposta.
  app.use(createActivityLogMiddleware(activityLogService.registrar));

  const { validToken } = createAuthMiddleware(buildAuthDeps());
  const mailProvider = options.mail ?? buildMailProvider();
  const inviteBaseUrl = `${env.CORS_ORIGIN}/invite`;
  const datajud =
    options.datajud ??
    (env.DATAJUD_API_KEY
      ? createDatajudClient({ baseUrl: env.DATAJUD_BASE_URL, apiKey: env.DATAJUD_API_KEY })
      : undefined);

  // PDF (AD-119): o Chromium só abre na primeira geração.
  const pdf = options.pdf ?? createChromiumPdfRenderer(env.CHROMIUM_PATH);
  // Arquivos do tenant (AD-120): sem bucket, o logo fica indisponível. `null` desliga nos testes.
  const storage =
    options.storage === null
      ? undefined
      : (options.storage ??
        (env.S3_BUCKET
          ? createS3FileStorage({
              endpoint: env.S3_ENDPOINT,
              region: env.S3_REGION,
              bucket: env.S3_BUCKET,
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            })
          : undefined));

  // Mapa de campo (AD-131): coordenadas do endereço do compromisso.
  const geocoder =
    options.geocoder ?? createNominatimGeocoder({ baseUrl: env.GEOCODER_URL, userAgent: env.GEOCODER_USER_AGENT });

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
  app.use('/tenant/office', createOfficeRouter({ validToken, storage }));
  app.use('/tenant/activity-log', createActivityLogRouter({ validToken }));
  app.use('/tenant', createTenantInviteRouter({ validToken, mailProvider, inviteBaseUrl }));
  app.use('/invites', inviteRouter);
  app.use('/auth', createAuthRouter({ validToken }));
  app.use('/me', createPreferencesRouter({ validToken }));
  app.use('/me', createAccountRouter({ validToken }));
  app.use('/expert-cases', createCaseRouter({ validToken }));
  app.use('/parties', createPartyRouter({ validToken }));
  app.use('/agenda', createAgendaRouter({ validToken, storage, mail: mailProvider, geocoder }));
  app.use('/inspections', createInspectionRouter({ validToken, storage }));
  app.use('/finance', createFinanceRouter({ validToken }));
  app.use('/documents', createDocumentsRouter({ validToken, pdf, storage }));
  app.use('/expert-reports', createReportRouter({ validToken, pdf, storage }));
  app.use('/prospecting', createProspectingRouter({ validToken, datajud }));

  app.use(errorHandler);

  return app;
};
