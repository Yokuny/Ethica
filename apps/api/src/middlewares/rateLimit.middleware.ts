import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { CustomError } from './errorHandler.middleware.js';

// Key by normalized e-mail + IP (synchronous — our version does not need the
// reference's async keyGenerator, which checked the clinic subscription).
const emailAndIpKeyGenerator = (req: Request): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'sem-email';
  return `${email}:${ipKeyGenerator(req.ip ?? 'unknown')}`;
};

// Authenticated template mutation routes have no e-mail in the body — the key
// is the tenant+IP pair (FLD-16). Deliberate divergence from the generator above.
const tenantAndIpKeyGenerator = (req: Request): string => {
  const tenant = req.tenantUser?.tenant ?? 'sem-tenant';
  return `${tenant}:${ipKeyGenerator(req.ip ?? 'unknown')}`;
};

// The client always gets the same key (`too_many_attempts`); `scope` only
// identifies the limiter in the errorHandler log.
const rejectWithTooManyRequests = (scope: string, keyGenerator = emailAndIpKeyGenerator, limit = 5) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, _res, next) => {
      next(new CustomError('too_many_attempts', 429, scope));
    },
  });
};

// FND-14: only protects sign-in and invite; both by normalized e-mail + IP.
export const signinRateLimit = rejectWithTooManyRequests('signin');
export const inviteRateLimit = rejectWithTooManyRequests('invite');

// Datajud search (CNJ public API, with a quota): by tenant + IP. 60 searches
// per 15 min cover manual prospecting without turning into automated scraping.
export const datajudSearchRateLimit = rejectWithTooManyRequests('datajud_search', tenantAndIpKeyGenerator, 60);

// iCal feed (PRZ-03): public route queried by Google/Outlook/Apple servers, which
// share an IP among thousands of subscribers — the key is the link token itself.
// 60 reads per 15 min leave room for any calendar refresh interval.
const feedTokenKeyGenerator = (req: Request): string => `feed:${String(req.params.token ?? 'sem-token')}`;
export const calendarFeedRateLimit = rejectWithTooManyRequests('calendar_feed', feedTokenKeyGenerator, 60);
