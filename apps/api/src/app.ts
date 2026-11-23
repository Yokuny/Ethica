import { respObj } from '@ethica/contracts';
import { createMailProvider, type MailProvider } from '@ethica/mail';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { register } from 'prom-client';
import { env } from './config/env.config.js';
import { registerAllSubscribers } from './events/index.js';
import { createActivityLogMiddleware } from './middlewares/activityLog.middleware.js';
import { createAuthMiddleware } from './middlewares/authentication.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { responseTime } from './middlewares/responseTime.middleware.js';
import { createAgendaRouter } from './modules/agenda/appointment.router.js';
import { createInspectionRouter } from './modules/agenda/inspection.router.js';
import { createAutomationRouter } from './modules/automation/automation.router.js';
import { createCaseRouter } from './modules/case/case.router.js';
import { createCourtDivisionRouter } from './modules/case/court-division.router.js';
import { createPartyRouter } from './modules/case/party.router.js';
import { createContactRouter } from './modules/contact/contact.router.js';
import { createDocumentsRouter } from './modules/documents/documents.router.js';
import { createReportRouter } from './modules/documents/report.router.js';
import { createFinanceRouter } from './modules/finance/transaction.router.js';
import { createAccountRouter } from './modules/identity/account.router.js';
import { createActivityLogRouter } from './modules/identity/activityLog.router.js';
import * as activityLogService from './modules/identity/activityLog.service.js';
import { buildAuthDeps } from './modules/identity/auth.deps.js';
import { createAuthRouter } from './modules/identity/auth.router.js';
import { createBillingRouter } from './modules/identity/billing.router.js';
import { createInviteRouter, createTeamInviteRouter } from './modules/identity/invite.router.js';
import { createOfficeRouter } from './modules/identity/office.router.js';
import { createPlatformRouter } from './modules/identity/platform.router.js';
import { createPreferencesRouter } from './modules/identity/preferences.router.js';
import { createPushRouter } from './modules/identity/push.router.js';
import { createNotificationRouter } from './modules/notifications/notification.router.js';
import { type AsaasClient, createAsaasClient } from './providers/asaasClient.js';
import { createS3FileStorage, type FileStorage } from './providers/fileStorage.js';
import { createNominatimGeocoder, type Geocoder } from './providers/geocoder.js';
import { createChromiumPdfRenderer, type PdfRenderer } from './providers/pdfRenderer.js';

// Immediate e-mails of the API (access key, invite, notice to the parties); the reminders are the worker's (AD-267).
export const buildMailProvider = (): MailProvider => createMailProvider(env);

// No .listen() — testable through supertest without opening a port. start() (server.ts)
// is what actually brings the process up. `pdf` and `storage` are injectable for tests.
export const buildApp = (
  options: {
    pdf?: PdfRenderer;
    storage?: FileStorage | null;
    mail?: MailProvider;
    geocoder?: Geocoder;
    asaas?: AsaasClient | null;
    contactInbox?: string;
  } = {},
): Express => {
  // Idempotent — several buildApp() calls in the same process (tests) do not duplicate handlers.
  registerAllSubscribers();

  const app = express();
  // Railway puts one proxy in front of the API: `req.ip` is the visitor, so the per-IP limits hold (AD-249).
  app.set('trust proxy', 1);

  // Content-Disposition exposed: the web reads the name of the generated PDF/ZIP (AD-119, AD-122).
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true, exposedHeaders: ['Content-Disposition'] }));
  app.use(cookieParser());
  // A report section with rich text goes past 100 kB: 1 MB only on `/expert-reports`; the global parser
  // ignores the body already read (AD-126).
  app.use('/expert-reports', express.json({ limit: '1mb' }));
  // Inspection record with many jobs and activities (AD-130).
  app.use('/inspections', express.json({ limit: '1mb' }));
  app.use(express.json());
  app.use(responseTime);
  // Activity log (AD-134): records every successful tenant write when the response ends.
  app.use(createActivityLogMiddleware(activityLogService.record));

  const { validToken, validSession } = createAuthMiddleware(buildAuthDeps());
  const mailProvider = options.mail ?? buildMailProvider();
  const inviteBaseUrl = `${env.CORS_ORIGIN}/invite`;

  // PDF (AD-119): Chromium only starts on the first generation.
  const pdf = options.pdf ?? createChromiumPdfRenderer(env.CHROMIUM_PATH);
  // Tenant files (AD-120): without a bucket the logo is unavailable. `null` turns it off in tests.
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
              roleArn: env.S3_ROLE_ARN,
            })
          : undefined));

  // Field map (AD-131): coordinates of the appointment address.
  const geocoder =
    options.geocoder ?? createNominatimGeocoder({ baseUrl: env.GEOCODER_URL, userAgent: env.GEOCODER_USER_AGENT });

  // Office subscription (AD-230). `null` turns it off in tests.
  const asaas =
    options.asaas === null
      ? undefined
      : (options.asaas ??
        (env.ASAAS_API_KEY ? createAsaasClient({ baseUrl: env.ASAAS_API_URL, apiKey: env.ASAAS_API_KEY }) : undefined));

  app.get('/health', (_req, res) => {
    res.json(respObj({ data: { service: 'api' } }));
  });

  // No validToken (same pattern as /health): Prometheus request and database metrics. Off in
  // production, where the API is public and nothing scrapes it (AD-153).
  if (env.NODE_ENV !== 'production') {
    app.get('/metrics', async (_req, res) => {
      res.set('Content-Type', register.contentType);
      // res.end (not res.send): res.send() reorders the Content-Type parameters.
      res.end(await register.metrics());
    });
  }

  app.use('/platform', createPlatformRouter({ validToken, mailProvider, inviteBaseUrl }));
  app.use('/tenant/office', createOfficeRouter({ validToken, storage }));
  app.use('/tenant/activity-log', createActivityLogRouter({ validToken }));
  app.use('/tenant', createTeamInviteRouter({ validToken, mailProvider, inviteBaseUrl }));
  app.use('/invites', createInviteRouter());
  app.use('/auth', createAuthRouter({ validToken, mailProvider, accessUrl: `${env.CORS_ORIGIN}/auth` }));
  app.use(
    '/billing',
    createBillingRouter({
      validSession,
      asaas,
      returnUrl: env.ASAAS_RETURN_URL,
      webhookToken: env.ASAAS_WEBHOOK_TOKEN,
    }),
  );
  app.use('/contact', createContactRouter({ mailProvider, inbox: options.contactInbox ?? env.CONTACT_EMAIL }));
  app.use('/me', createPreferencesRouter({ validToken }));
  app.use('/me', createPushRouter({ validToken, publicKey: env.VAPID_PUBLIC_KEY }));
  app.use('/me', createAccountRouter({ validToken }));
  app.use('/expert-cases', createCaseRouter({ validToken, storage }));
  app.use('/notifications', createNotificationRouter({ validToken }));
  app.use('/automation', createAutomationRouter({ validToken }));
  app.use('/parties', createPartyRouter({ validToken }));
  app.use('/court-divisions', createCourtDivisionRouter({ validToken }));
  app.use('/agenda', createAgendaRouter({ validToken, storage, mail: mailProvider, geocoder }));
  app.use('/inspections', createInspectionRouter({ validToken, storage }));
  app.use('/finance', createFinanceRouter({ validToken }));
  app.use('/documents', createDocumentsRouter({ validToken, pdf, storage }));
  app.use('/expert-reports', createReportRouter({ validToken, pdf, storage }));

  app.use(errorHandler);

  return app;
};
