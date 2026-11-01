import { hasPermission, type PermissionAction, type PermissionModule, type Role } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from './errorHandler.middleware.js';

// checkRole is synchronous and only reads req.tenantUser (already resolved from the database by
// createAuthMiddleware) — it never touches data before deciding (FND-08).
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

// Permission matrix (AD-137): every requested action on the module. Like checkRole, it only reads
// req.tenantUser and decides before any data.
export const can = (module: PermissionModule, ...actions: PermissionAction[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const permissions = req.tenantUser?.permissions ?? {};
    if (!actions.every((action) => hasPermission(permissions, module, action))) {
      next(new CustomError('no_permission', 403));
      return;
    }
    next();
  };
};

export const isAdmin = checkRole(['admin']);
export const isManager = checkRole(['manager']);
export const isOperator = checkRole(['operator']);

// 403 before ANY access to data/controller (FND-01/AC3) — calling
// next(err) here is what stops Express from moving on to the route; only the
// isPlatformAdmin flag already resolved by createAuthMiddleware decides, never the body.
export const platformAdminOnly = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.tenantUser?.isPlatformAdmin) {
    next(new CustomError('no_permission', 403, 'restrito a administradores da plataforma'));
    return;
  }

  next();
};
