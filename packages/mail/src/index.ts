import nodemailer from 'nodemailer';
import { createLogMailProvider } from './log.mailProvider.js';
import type { MailProvider } from './mailProvider.type.js';
import { createNodemailerMailProvider } from './nodemailer.mailProvider.js';
import { createResendMailProvider } from './resend.mailProvider.js';

export { createLogMailProvider } from './log.mailProvider.js';
export type { MailProvider } from './mailProvider.type.js';
export { createNodemailerMailProvider } from './nodemailer.mailProvider.js';
export { createResendMailProvider } from './resend.mailProvider.js';

// The mail settings each service reads from its own env (AD-267: api and worker send e-mail).
export type MailConfig = {
  MAIL_PROVIDER: 'log' | 'nodemailer' | 'resend';
  MAIL_FROM?: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
};

export const createMailProvider = (config: MailConfig): MailProvider => {
  if (config.MAIL_PROVIDER === 'resend') {
    return createResendMailProvider(config.RESEND_API_KEY ?? '', config.MAIL_FROM ?? '');
  }
  if (config.MAIL_PROVIDER === 'nodemailer') {
    const transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ? Number(config.SMTP_PORT) : undefined,
      // Port 465 (e.g. Zoho Mail) is TLS from the start; 587 upgrades with STARTTLS.
      secure: config.SMTP_PORT === '465',
      auth: config.SMTP_USER && config.SMTP_PASS ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    });
    return createNodemailerMailProvider(transport, config.MAIL_FROM ?? '');
  }
  return createLogMailProvider();
};

// AD-222: a real provider needs its own keys in every environment. Production also refuses `log`.
export const mailIssues = (config: MailConfig & { NODE_ENV: string }): string[] => {
  const from = config.MAIL_FROM ? [] : ['MAIL_FROM'];
  if (config.MAIL_PROVIDER === 'resend') return [...(config.RESEND_API_KEY ? [] : ['RESEND_API_KEY']), ...from];
  if (config.MAIL_PROVIDER === 'nodemailer') return [...(config.SMTP_HOST ? [] : ['SMTP_HOST']), ...from];
  return config.NODE_ENV === 'production' ? ['MAIL_PROVIDER', ...from] : [];
};
