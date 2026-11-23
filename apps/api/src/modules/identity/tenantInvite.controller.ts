import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { PlatformControllerDeps } from './platform.schema.js';
import * as platformService from './platform.service.js';

export const inviteTeamMember =
  (deps: PlatformControllerDeps) =>
  async (req: Request, res: Response): Promise<void> => {
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
  };
