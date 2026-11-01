import type { ActivityLogAction, ActivityLogModule, ListActivityLogQuery } from '@ethica/contracts';
import { listActivityLogQuerySchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { ActivityLogAction, ActivityLogModule, ListActivityLogQuery };
export { listActivityLogQuerySchema };

export type ActivityLogRouterDeps = { validToken: RequestHandler };

// What the middleware (or the sign-in) reports; the name of whoever did it is read here.
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
