import { hostname } from 'node:os';
import { mailIssues } from '@ethica/mail';
import { z } from 'zod';

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value : undefined));

// The worker (AD-267) talks to the api only through the database: it needs the database, the e-mail and the
// address of the web for the links. Validated on import (fail-fast), like the api's.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória'),
  // Address of the web, for the links of the e-mails (the api's CORS_ORIGIN).
  APP_URL: z.string().min(1, 'APP_URL é obrigatória'),
  MAIL_PROVIDER: z.enum(['log', 'nodemailer', 'resend']).default('log'),
  MAIL_FROM: z.string().optional(),
  RESEND_API_KEY: optionalSecret,
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Datajud (AD-271): the key is the worker's only. Without it the tracking in court stays off.
  DATAJUD_API_KEY: optionalSecret,
  DATAJUD_BASE_URL: z.string().default('https://api-publica.datajud.cnj.jus.br'),
  DATAJUD_MIN_INTERVAL_MS: z.coerce.number().int().min(0).default(1000),
  // `/health` and `/metrics`. PORT (Railway) wins.
  WORKER_PORT: z.string().default('18090'),
  // Jobs at the same time; one leaves the sweep and the digest in order.
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  // How often the queue is read when idle, and how often the scheduler enqueues.
  WORKER_POLL_MS: z.coerce.number().int().min(100).default(1000),
  WORKER_SCHEDULER_MS: z.coerce.number().int().min(1000).default(60_000),
  WORKER_INSTANCE: z.string().default(`${hostname()}-${process.pid}`),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv): WorkerEnv => {
  const result = envSchema.safeParse({ ...source, WORKER_PORT: source.PORT ?? source.WORKER_PORT });
  const missing = result.success ? mailIssues(result.data) : result.error.issues.map((issue) => issue.path.join('.'));
  if (!result.success || missing.length > 0) {
    throw new Error(`Variável(is) de ambiente ausente(s) ou inválida(s): ${missing.join(', ')}`);
  }
  return result.data;
};
