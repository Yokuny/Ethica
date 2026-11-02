import { env } from './env.config.js';

// Ported verbatim from DentalEase-BackEnd/src/config/cookie.config.ts.
export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV !== 'development',
  sameSite: (env.NODE_ENV !== 'development' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  // ACE-06 (AD-155): 30 days per device, same as the Session TTL.
  maxAge: 30 * 86400 * 1000,
};

export const clearCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV !== 'development',
  sameSite: (env.NODE_ENV !== 'development' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};
