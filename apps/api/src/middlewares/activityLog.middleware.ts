import type { ActivityLogAction, ActivityLogModule } from '@ethica/contracts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Activity log (AD-134): a single middleware records every successful tenant write.
// The writer is injected by `app.ts` (the shared layer does not import modules) and never
// segura nem derruba a resposta.
export type Activity = {
  tenantId: string;
  userId: string;
  module: ActivityLogModule;
  resource?: string;
  action: ActivityLogAction;
  recordId?: string;
  label?: string;
};

const OBJECT_ID = /^[0-9a-f]{24}$/;
const ESCRITA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ACTION_BY_METHOD: Record<string, ActivityLogAction> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};
// Path suffix that names the action better than the method.
const ACTION_BY_SUFFIX: Record<string, ActivityLogAction> = {
  complete: 'complete',
  convert: 'convert',
  notice: 'notify',
  export: 'export',
  move: 'update',
};
// Technical effect or a read through POST: not an action of whoever uses the system.
const IGNORED = [
  '/me/preferences',
  '/auth/signin',
  '/auth/signout',
  '/invites/',
  '/platform/',
  '/prospecting/datajud/search',
];
const LABELS = ['processNumber', 'title', 'name', 'description', 'email'] as const;

const moduleOf = (literals: string[]): ActivityLogModule | undefined => {
  const [first, second] = literals;
  if (first === 'expert-reports') return second === 'templates' ? 'report_templates' : 'expert_reports';
  if (first === 'tenant') return second === 'invites' ? 'users' : 'office';
  if (first === 'auth') return 'users';
  const map: Record<string, ActivityLogModule> = {
    'expert-cases': 'expert_cases',
    parties: 'parties',
    'court-divisions': 'court_divisions',
    agenda: 'agenda',
    inspections: 'agenda',
    finance: 'finance',
    prospecting: 'prospecting',
    documents: 'office',
    me: 'account',
  };
  return first ? map[first] : undefined;
};

// Module, resource and action from the method and the path; `undefined` = not recorded.
export const describeRequest = (
  method: string,
  path: string,
): { module: ActivityLogModule; resource?: string; action: ActivityLogAction; recordId?: string } | undefined => {
  const dataExport = method === 'GET' && path === '/documents/export';
  if (!ESCRITA.has(method) && !dataExport) return undefined;
  if (IGNORED.some((prefix) => path.startsWith(prefix)) || path.endsWith('/geocode')) return undefined;
  const segments = path.split('/').filter(Boolean);
  const literals = segments.filter((segment) => !OBJECT_ID.test(segment));
  const module = moduleOf(literals);
  if (!module) return undefined;
  const last = literals.at(-1) ?? '';
  const action = literals.includes('import') ? 'import' : (ACTION_BY_SUFFIX[last] ?? ACTION_BY_METHOD[method]);
  if (!action) return undefined;
  const internal = literals.slice(module === 'report_templates' || literals[0] === 'tenant' ? 2 : 1);
  const resource = internal.filter((literal) => !(literal in ACTION_BY_SUFFIX) && literal !== 'import').at(-1);
  return { module, action, resource, recordId: segments.find((segment) => OBJECT_ID.test(segment)) };
};

const labelOf = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const key = LABELS.find((name) => typeof record[name] === 'string' && record[name]);
  return key ? (record[key] as string) : undefined;
};

export const createActivityLogMiddleware = (record: (activity: Activity) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const description = describeRequest(req.method, req.path);
    if (!description) {
      next();
      return;
    }
    let responseBody: unknown;
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      responseBody = body;
      return json(body);
    };
    res.on('finish', () => {
      const tenantUser = req.tenantUser;
      if (!tenantUser?.tenant || res.statusCode >= 400) return;
      const data = (responseBody as { data?: { id?: unknown } } | undefined)?.data;
      const responseId = typeof data?.id === 'string' ? data.id : undefined;
      void record({
        tenantId: tenantUser.tenant,
        userId: tenantUser.user,
        ...description,
        recordId: description.recordId ?? responseId,
        label: labelOf(data),
      });
    });
    next();
  };
};
