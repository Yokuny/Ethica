import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { CustomError } from './errorHandler.middleware.js';

// Chave por e-mail normalizado + IP (síncrono — nossa versão não precisa do
// keyGenerator assíncrono da referência, que checava assinatura da clínica).
const emailAndIpKeyGenerator = (req: Request): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'sem-email';
  return `${email}:${ipKeyGenerator(req.ip ?? 'unknown')}`;
};

// Rotas autenticadas de mutação de template não têm e-mail no corpo — a chave
// é o par tenant+IP (FLD-16). Divergência consciente do gerador acima.
const tenantAndIpKeyGenerator = (req: Request): string => {
  const tenant = req.tenantUser?.tenant ?? 'sem-tenant';
  return `${tenant}:${ipKeyGenerator(req.ip ?? 'unknown')}`;
};

// O cliente sempre recebe a mesma chave (`too_many_attempts`); `scope` só
// identifica o limitador no log do errorHandler.
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

// FND-14: só protege login e convite; ambos por e-mail normalizado + IP.
export const signinRateLimit = rejectWithTooManyRequests('signin');
export const inviteRateLimit = rejectWithTooManyRequests('invite');

// Busca no Datajud (API pública do CNJ, com cota): por tenant + IP. 60 buscas
// por 15 min cobrem a prospecção manual sem virar varredura automatizada.
export const datajudSearchRateLimit = rejectWithTooManyRequests('datajud_search', tenantAndIpKeyGenerator, 60);
