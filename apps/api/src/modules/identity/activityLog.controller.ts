import { respObj } from '@ethica/contracts';
import type { NextFunction, Request, Response } from 'express';
import type { ListActivityLogQuery } from './activityLog.schema.js';
import * as activityLogService from './activityLog.service.js';

export const listActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await activityLogService.listActivities(
      req.tenantUser.tenant as string,
      req.query as unknown as ListActivityLogQuery,
    );
    res.json(respObj({ data }));
  } catch (e) {
    next(e);
  }
};
