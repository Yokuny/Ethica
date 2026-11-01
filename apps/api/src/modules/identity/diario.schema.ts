import type { DiarioAcao, DiarioModulo, ListDiarioQuery } from '@ethica/contracts';
import { listDiarioQuerySchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';

export type { DiarioAcao, DiarioModulo, ListDiarioQuery };
export { listDiarioQuerySchema };

export type DiarioRouterDeps = { validToken: RequestHandler };

// O que o middleware (ou o login) informa; o nome de quem fez é lido aqui.
export type NovaAtividade = {
  tenantId: string;
  userId: string;
  modulo: DiarioModulo;
  recurso?: string;
  acao: DiarioAcao;
  registroId?: string;
  rotulo?: string;
};

export type AtividadeRecord = {
  id: string;
  userId: string;
  userName: string;
  modulo: DiarioModulo;
  recurso?: string;
  acao: DiarioAcao;
  registroId?: string;
  rotulo?: string;
  createdAt: Date;
};
