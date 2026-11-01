import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { signinRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as authController from './auth.controller.js';
import type { AuthRouterDeps } from './auth.schema.js';
import {
  listUsersQuerySchema,
  signinSchema,
  updatePermissoesSchema,
  userDirectoryQuerySchema,
  userIdParamSchema,
} from './auth.schema.js';

// Mesmo papel (canOperate) já exigido em GET /conversations
// (conversation.router.ts) — /auth/users existe pra alimentar o filtro de
// "responsável" da fila de conversas, então qualquer papel autenticado do
// tenant que acessa o inbox também pode listar o diretório de usuários.
const canOperate = checkRole(['admin', 'manager', 'operator']);
// REG-07 (AD-071): e-mail e papel de todo o time só para admin; /users acima
// continua com só {id,name} para os seletores de responsável.
const isAdmin = checkRole(['admin']);

export const createAuthRouter = (deps: AuthRouterDeps): Router => {
  const router = Router();

  router.post('/signin', signinRateLimit, validBody(signinSchema), authController.signin);
  // Sem validToken: sair precisa funcionar (e limpar o cookie) mesmo com a
  // sessão já inválida.
  router.post('/signout', authController.signout);
  router.get('/session', deps.validToken, authController.session);
  router.get(
    '/users',
    deps.validToken,
    tenantAssignmentCheck,
    canOperate,
    validParsedQuery(listUsersQuerySchema),
    authController.listUsers,
  );
  router.get(
    '/users/directory',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    validParsedQuery(userDirectoryQuerySchema),
    authController.listUserDirectory,
  );
  // AD-137: matriz de permissões do membro, só o admin ajusta.
  router.patch(
    '/users/:id/permissions',
    deps.validToken,
    tenantAssignmentCheck,
    isAdmin,
    validParams(userIdParamSchema),
    validBody(updatePermissoesSchema),
    authController.updatePermissoes,
  );
  // ACC-06: a foto aparece onde o responsável aparece, então segue o mesmo papel de /users.
  router.get(
    '/users/:id/avatar',
    deps.validToken,
    tenantAssignmentCheck,
    canOperate,
    validParams(userIdParamSchema),
    authController.getUserAvatar,
  );

  return router;
};
