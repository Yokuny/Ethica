import type { MailProvider } from '@ethica/mail';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../middlewares/errorHandler.middleware.js';
import { createContactRouter } from './contact.router.js';

const MESSAGE = {
  name: 'Ana <b>Perita</b>',
  email: 'ana@perita.com',
  phone: '11 99999-0000',
  subject: 'plans',
  message: 'Quero saber do plano anual.',
};

const buildApp = (deps: { inbox?: string; sent?: boolean }) => {
  const mailProvider: MailProvider = { send: vi.fn(async () => ({ sent: deps.sent ?? true })) };
  const app = express();
  // As in app.ts: the visitor IP comes from the proxy (AD-249).
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/contact', createContactRouter({ mailProvider, inbox: deps.inbox }));
  app.use(errorHandler);
  return { app, send: mailProvider.send as ReturnType<typeof vi.fn> };
};

const post = (app: express.Express, ip: string, body: object = MESSAGE) =>
  request(app).post('/contact').set('X-Forwarded-For', ip).send(body);

describe('POST /contact (AD-249)', () => {
  it('sends the message to the configured inbox only, with the visitor text escaped (PUB-02)', async () => {
    const { app, send } = buildApp({ inbox: 'contato@ethica.com' });
    const res = await post(app, '10.0.0.1', { ...MESSAGE, email: 'outro@destino.com' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { sent: true } });
    expect(send).toHaveBeenCalledTimes(1);
    const [to, subject, body] = send.mock.calls[0] as [string, string, string];
    expect(to).toBe('contato@ethica.com');
    expect(subject).toBe('Contato pelo site: Planos e pagamento');
    expect(body).toContain('Ana &lt;b&gt;Perita&lt;/b&gt;');
    expect(body).toContain('outro@destino.com');
  });

  it('refuses an invalid message (400) without sending', async () => {
    const { app, send } = buildApp({ inbox: 'contato@ethica.com' });
    const res = await post(app, '10.0.0.2', { ...MESSAGE, subject: 'spam', to: 'x@y.com' });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('without CONTACT_EMAIL answers contact_not_configured; a mail failure answers email_send_failed (PUB-03)', async () => {
    const off = await post(buildApp({}).app, '10.0.0.3');
    expect(off.status).toBe(503);
    expect(off.body.message).toBe('contact_not_configured');

    const failed = await post(buildApp({ inbox: 'contato@ethica.com', sent: false }).app, '10.0.0.4');
    expect(failed.status).toBe(502);
    expect(failed.body.message).toBe('email_send_failed');
  });

  it('5 messages per IP every 15 minutes, whatever the e-mail of the form (PUB-04)', async () => {
    const { app } = buildApp({ inbox: 'contato@ethica.com' });
    for (let i = 0; i < 5; i++) {
      expect((await post(app, '10.0.0.5', { ...MESSAGE, email: `v${i}@x.com` })).status).toBe(200);
    }
    const blocked = await post(app, '10.0.0.5', { ...MESSAGE, email: 'v9@x.com' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe('too_many_attempts');
    expect((await post(app, '10.0.0.6')).status).toBe(200);
  });
});
