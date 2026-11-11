import { describe, expect, it, vi } from 'vitest';
import { createResendMailProvider } from './resend.mailProvider.js';

describe('createResendMailProvider', () => {
  it('posts the message to the Resend API and returns {sent: true} on 2xx', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    const provider = createResendMailProvider('re_key', 'Ethica <noreply@ethica.com>', fetchFn);

    await expect(provider.send('convidado@example.com', 'Convite', 'body')).resolves.toEqual({ sent: true });
    expect(fetchFn).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer re_key', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ethica <noreply@ethica.com>',
        to: 'convidado@example.com',
        subject: 'Convite',
        html: 'body',
      }),
    });
  });

  it('returns {sent: false} without throwing when Resend answers an error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchFn = vi.fn().mockResolvedValue(new Response('{"name":"validation_error"}', { status: 422 }));
    const provider = createResendMailProvider('re_key', 'noreply@ethica.com', fetchFn);

    await expect(provider.send('a@b.com', 'Convite', 'body')).resolves.toEqual({ sent: false });
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({ event: 'mail.send_failed', status: 422 });
    spy.mockRestore();
  });

  it('returns {sent: false} without throwing when the request fails (network down)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchFn = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const provider = createResendMailProvider('re_key', 'noreply@ethica.com', fetchFn);

    await expect(provider.send('a@b.com', 'Convite', 'body')).resolves.toEqual({ sent: false });
    spy.mockRestore();
  });
});
