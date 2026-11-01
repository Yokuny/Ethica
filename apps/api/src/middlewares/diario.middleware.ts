import type { DiarioAcao, DiarioModulo } from '@ethica/contracts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Diário de bordo (AD-134): um middleware único grava toda escrita bem-sucedida do tenant.
// A gravação é injetada pelo `app.ts` (a camada compartilhada não importa módulos) e nunca
// segura nem derruba a resposta.
export type Atividade = {
  tenantId: string;
  userId: string;
  modulo: DiarioModulo;
  recurso?: string;
  acao: DiarioAcao;
  registroId?: string;
  rotulo?: string;
};

const OBJECT_ID = /^[0-9a-f]{24}$/;
const ESCRITA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ACAO_POR_METODO: Record<string, DiarioAcao> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};
// Sufixo de caminho que nomeia a ação melhor que o método.
const ACAO_POR_SUFIXO: Record<string, DiarioAcao> = {
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
const ROTULOS = ['processNumber', 'titulo', 'nome', 'descricao', 'email'] as const;

const moduloDe = (literais: string[]): DiarioModulo | undefined => {
  const [primeiro, segundo] = literais;
  if (primeiro === 'expert-reports') return segundo === 'templates' ? 'report_templates' : 'expert_reports';
  if (primeiro === 'tenant') return segundo === 'invites' ? 'users' : 'office';
  if (primeiro === 'auth') return 'users';
  const map: Record<string, DiarioModulo> = {
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
): { modulo: DiarioModulo; recurso?: string; acao: DiarioAcao; registroId?: string } | undefined => {
  const exportacao = method === 'GET' && path === '/documents/export';
  if (!ESCRITA.has(method) && !exportacao) return undefined;
  if (IGNORADAS.some((prefixo) => path.startsWith(prefixo)) || path.endsWith('/geocode')) return undefined;
  const segmentos = path.split('/').filter(Boolean);
  const literais = segmentos.filter((segmento) => !OBJECT_ID.test(segmento));
  const modulo = moduloDe(literais);
  if (!modulo) return undefined;
  const ultimo = literais.at(-1) ?? '';
  const acao = literais.includes('import') ? 'import' : (ACAO_POR_SUFIXO[ultimo] ?? ACAO_POR_METODO[method]);
  if (!acao) return undefined;
  const internal = literais.slice(modulo === 'report_templates' || literais[0] === 'tenant' ? 2 : 1);
  const recurso = internal.filter((literal) => !(literal in ACAO_POR_SUFIXO) && literal !== 'import').at(-1);
  return { modulo, acao, recurso, registroId: segmentos.find((segmento) => OBJECT_ID.test(segmento)) };
};

const rotuloDe = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const chave = ROTULOS.find((nome) => typeof record[nome] === 'string' && record[nome]);
  return chave ? (record[chave] as string) : undefined;
};

export const createDiarioMiddleware = (registrar: (atividade: Atividade) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const descricao = descreverRequisicao(req.method, req.path);
    if (!descricao) {
      next();
      return;
    }
    let corpo: unknown;
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      corpo = body;
      return json(body);
    };
    res.on('finish', () => {
      const tenantUser = req.tenantUser;
      if (!tenantUser?.tenant || res.statusCode >= 400) return;
      const data = (corpo as { data?: { id?: unknown } } | undefined)?.data;
      const idDaResposta = typeof data?.id === 'string' ? data.id : undefined;
      void registrar({
        tenantId: tenantUser.tenant,
        userId: tenantUser.user,
        ...descricao,
        registroId: descricao.registroId ?? idDaResposta,
        rotulo: rotuloDe(data),
      });
    });
    next();
  };
};
