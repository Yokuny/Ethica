import type { ActivityLogAction, ActivityLogModule } from '@ethica/contracts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Diário de bordo (AD-134): um middleware único grava toda escrita bem-sucedida do tenant.
// A gravação é injetada pelo `app.ts` (a camada compartilhada não importa módulos) e nunca
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
// Sufixo de caminho que nomeia a ação melhor que o método.
const ACTION_BY_SUFFIX: Record<string, ActivityLogAction> = {
  complete: 'complete',
  convert: 'convert',
  notice: 'notify',
  export: 'export',
  move: 'update',
};
// Efeito técnico ou leitura com POST: não é ação de quem usa o sistema.
const IGNORADAS = [
  '/me/preferences',
  '/auth/signin',
  '/auth/signout',
  '/invites/',
  '/platform/',
  '/prospecting/datajud/search',
];
const LABELS = ['processNumber', 'titulo', 'nome', 'descricao', 'email'] as const;

const moduleOf = (literals: string[]): ActivityLogModule | undefined => {
  const [primeiro, segundo] = literals;
  if (primeiro === 'expert-reports') return segundo === 'templates' ? 'report_templates' : 'expert_reports';
  if (primeiro === 'tenant') return segundo === 'invites' ? 'users' : 'office';
  if (primeiro === 'auth') return 'users';
  const map: Record<string, ActivityLogModule> = {
    'expert-cases': 'expert_cases',
    parties: 'parties',
    agenda: 'agenda',
    inspections: 'agenda',
    finance: 'finance',
    prospecting: 'prospecting',
    documents: 'office',
    me: 'account',
  };
  return primeiro ? map[primeiro] : undefined;
};

// Módulo, recurso e ação a partir do método e do caminho; `undefined` = não registra.
export const descreverRequisicao = (
  method: string,
  path: string,
): { module: ActivityLogModule; resource?: string; action: ActivityLogAction; recordId?: string } | undefined => {
  const dataExport = method === 'GET' && path === '/documents/export';
  if (!ESCRITA.has(method) && !dataExport) return undefined;
  if (IGNORADAS.some((prefix) => path.startsWith(prefix)) || path.endsWith('/geocode')) return undefined;
  const segmentos = path.split('/').filter(Boolean);
  const literals = segmentos.filter((segmento) => !OBJECT_ID.test(segmento));
  const module = moduleOf(literals);
  if (!module) return undefined;
  const last = literals.at(-1) ?? '';
  const action = literals.includes('import') ? 'import' : (ACTION_BY_SUFFIX[last] ?? ACTION_BY_METHOD[method]);
  if (!action) return undefined;
  const internal = literals.slice(module === 'report_templates' || literals[0] === 'tenant' ? 2 : 1);
  const resource = internal.filter((literal) => !(literal in ACTION_BY_SUFFIX) && literal !== 'import').at(-1);
  return { module, action, resource, recordId: segmentos.find((segmento) => OBJECT_ID.test(segmento)) };
};

const labelOf = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const chave = LABELS.find((nome) => typeof record[nome] === 'string' && record[nome]);
  return chave ? (record[chave] as string) : undefined;
};

export const createActivityLogMiddleware = (registrar: (activity: Activity) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const descricao = descreverRequisicao(req.method, req.path);
    if (!descricao) {
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
      const idDaResposta = typeof data?.id === 'string' ? data.id : undefined;
      void registrar({
        tenantId: tenantUser.tenant,
        userId: tenantUser.user,
        ...descricao,
        recordId: descricao.recordId ?? idDaResposta,
        label: labelOf(data),
      });
    });
    next();
  };
};
