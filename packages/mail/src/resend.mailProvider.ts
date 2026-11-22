import type { MailProvider } from './mailProvider.type.js';

const RESEND_URL = 'https://api.resend.com/emails';

// Resend HTTP API (AD-219): HTTPS instead of SMTP, which Railway blocks. `fetchFn` is
// injectable for tests. A rejected request or a non-2xx answer never throws — it becomes
// {sent: false}, and the operation that triggered the e-mail follows its normal flow (FND-12).
export const createResendMailProvider = (
  apiKey: string,
  from: string,
  fetchFn: typeof fetch = fetch,
): MailProvider => ({
  send: async (to, subject, body) => {
    try {
      const response = await fetchFn(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html: body }),
      });
      if (response.ok) return { sent: true };
      console.error(
        JSON.stringify({ event: 'mail.send_failed', status: response.status, message: await response.text() }),
      );
      return { sent: false };
    } catch (e) {
      console.error(JSON.stringify({ event: 'mail.send_failed', message: e instanceof Error ? e.message : String(e) }));
      return { sent: false };
    }
  },
});
