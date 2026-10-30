import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { PlatformControllerDeps } from './platform.schema.js';
import * as platformService from './platform.service.js';

export const createTenantInviteController = (deps: PlatformControllerDeps) => {
  const inviteTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await platformService.inviteTeamMember(
        req.tenantUser.tenant as string,
        req.body,
        req.tenantUser.user,
        deps.mailProvider,
        deps.inviteBaseUrl,
      );
      res
        .status(result.sent ? 201 : 202)
        .json(respObj({ data: { id: result.id }, message: result.sent ? undefined : 'invite_email_failed' }));
    } catch (e) {
      next(e);
    }
  };
  return { inviteTeamMember };
};
