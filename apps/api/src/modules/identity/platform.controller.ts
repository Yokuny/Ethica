import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { PlatformControllerDeps } from './platform.schema.js';
import * as platformService from './platform.service.js';

export const createPlatformController = (deps: PlatformControllerDeps) => {
  const provisionTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await platformService.provisionTenant(req.body);
      res.status(201).json(respObj({ data: result }));
    } catch (e) {
      next(e);
    }
  };

  // 202 when sending fails but the invite is already persisted (FND-12) —
  // never 500, the e-mail is not what guarantees the resource creation.
  const inviteToTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await platformService.inviteToTenant(
        req.params.id as string,
        req.body,
        req.tenantUser.user,
        deps.mailProvider,
        deps.inviteBaseUrl,
      );
      const status = result.sent ? 201 : 202;
      res.status(status).json(
        respObj({
          data: { id: result.id },
          message: result.sent ? undefined : 'invite_email_failed',
        }),
      );
    } catch (e) {
      next(e);
    }
  };

  return { provisionTenant, inviteToTenant };
};
