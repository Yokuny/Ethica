import type { NextFunction, Request, Response } from 'express';
import { CustomError } from './errorHandler.middleware.js';

// 424 exactly when req.tenantUser.tenant is missing (FND-05/AC4) —
// tells the user to complete the link, without revealing internal detail.
export const tenantAssignmentCheck = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.tenantUser?.tenant) {
    next(new CustomError('company_link_required', 424));
    return;
  }

  next();
};
