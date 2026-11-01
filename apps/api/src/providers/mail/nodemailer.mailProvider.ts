import type { Transporter } from 'nodemailer';
import type { MailProvider } from './mailProvider.type.js';

// Injected transporter (factory testable without real SMTP). A transport failure
// never throws — it becomes {sent: false}, and the invite/operation that triggered the
// e-mail follows its normal flow (FND-12).
export const createNodemailerMailProvider = (transport: Pick<Transporter, 'sendMail'>, from: string): MailProvider => ({
  send: async (to, subject, body) => {
    try {
      await transport.sendMail({ to, subject, html: body, from });
      return { sent: true };
    } catch (e) {
      console.error(JSON.stringify({ event: 'mail.send_failed', message: e instanceof Error ? e.message : String(e) }));
      return { sent: false };
    }
  },
});
