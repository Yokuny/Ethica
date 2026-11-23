import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { PlatformControllerDeps } from './platform.schema.js';
import * as platformService from './platform.service.js';

export const provisionTenant = async (req: Request, res: Response): Promise<void> => {
  const result = await platformService.provisionTenant(req.body);
  res.status(201).json(respObj({ data: result }));
};

// 202 when sending fails but the invite is already persisted (FND-12) —
// never 500, the e-mail is not what guarantees the resource creation.
export const inviteToTenant =
  (deps: PlatformControllerDeps) =>
  async (req: Request, res: Response): Promise<void> => {
    const result = await platformService.inviteToTenant(
      req.params.id as string,
      req.body,
      req.tenantUser.user,
      deps.mailProvider,
      deps.inviteBaseUrl,
    );
    res
      .status(result.sent ? 201 : 202)
      .json(respObj({ data: { id: result.id }, message: result.sent ? undefined : 'invite_email_failed' }));
  };
