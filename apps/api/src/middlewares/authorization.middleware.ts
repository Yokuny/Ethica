import { type PermissionAction, type PermissionModule, pode, type Role } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from './errorHandler.middleware.js';

// checkRole é síncrono e só lê req.tenantUser (já resolvido do banco por
// createAuthMiddleware) — nunca toca dados antes de decidir (FND-08).
export const checkRole = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRoles = req.tenantUser?.role ?? [];
    const hasPermission = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      next(new CustomError('no_permission', 403));
      return;
    }

    next();
  };
};

// Matriz de permissões (AD-137): todas as ações pedidas no módulo. Como checkRole, só lê
// req.tenantUser e decide antes de qualquer dado.
export const can = (module: PermissionModule, ...actions: PermissionAction[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const permissions = req.tenantUser?.permissions ?? {};
    if (!actions.every((action) => pode(permissions, module, action))) {
      next(new CustomError('no_permission', 403));
      return;
    }
    next();
  };
};

export const isAdmin = checkRole(['admin']);
export const isManager = checkRole(['manager']);
export const isOperator = checkRole(['operator']);

// 403 antes de QUALQUER acesso a dados/controller (FND-01/AC3) — chamar
// next(err) aqui é o que impede o Express de seguir para a rota; só a flag
// isPlatformAdmin já resolvida por createAuthMiddleware decide, nunca o body.
export const platformAdminOnly = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.tenantUser?.isPlatformAdmin) {
    next(new CustomError('no_permission', 403, 'restrito a administradores da plataforma'));
    return;
  }

  next();
};
