import { respObj } from '@ethica/contracts';
import type { Request, Response } from 'express';
import type { InviteMailDeps } from './invite.schema.js';
import * as inviteService from './invite.service.js';

export const peekInvite = async (req: Request, res: Response): Promise<void> => {
  const result = await inviteService.peekInvite(req.params.token as string);
  res.json(respObj({ data: result }));
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  const data = await inviteService.acceptInvite(req.params.token as string, req.body);
  res.status(201).json(respObj({ data, message: 'created_successfully' }));
};

// Platform admin invites the first admin of an office. 202 when sending fails but the invite is
// already persisted (FND-12) — never 500, the e-mail is not what guarantees the resource creation.
export const inviteToTenant =
  (deps: InviteMailDeps) =>
  async (req: Request, res: Response): Promise<void> => {
    const { mailProvider, inviteBaseUrl } = deps;
    const result = await inviteService.inviteToTenant(
      req.params.id as string,
      req.body,
      req.tenantUser.user,
      mailProvider,
      inviteBaseUrl,
    );
    res
      .status(result.sent ? 201 : 202)
      .json(respObj({ data: { id: result.id }, message: result.sent ? undefined : 'invite_email_failed' }));
  };

// The office admin invites a team member.
export const inviteTeamMember =
  (deps: InviteMailDeps) =>
  async (req: Request, res: Response): Promise<void> => {
    const { mailProvider, inviteBaseUrl } = deps;
    const tenantId = req.tenantUser.tenant as string;
    const result = await inviteService.inviteTeamMember(
      tenantId,
      req.body,
      req.tenantUser.user,
      mailProvider,
      inviteBaseUrl,
    );
    res
      .status(result.sent ? 201 : 202)
      .json(respObj({ data: { id: result.id }, message: result.sent ? undefined : 'invite_email_failed' }));
  };
