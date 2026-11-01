import type { ActivityLogAction, ActivityLogModule, ListActivityLogQuery } from '@ethica/contracts';
import { listActivityLogQuerySchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { ActivityLogAction, ActivityLogModule, ListActivityLogQuery };
export { listActivityLogQuerySchema };

export type ActivityLogRouterDeps = { validToken: RequestHandler };

// O que o middleware (ou o login) informa; o nome de quem fez é lido aqui.
export type NewActivity = {
  tenantId: string;
  userId: string;
  module: ActivityLogModule;
  resource?: string;
  action: ActivityLogAction;
  recordId?: string;
  label?: string;
};

export type ActivityRecord = {
  id: string;
  userId: string;
  userName: string;
  module: ActivityLogModule;
  resource?: string;
  action: ActivityLogAction;
  recordId?: string;
  label?: string;
  createdAt: Date;
};
