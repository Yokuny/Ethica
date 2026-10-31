import type { FinanceiroReportQuery } from '@ethica/contracts';
import { financeiroReportQuerySchema, idSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import type { CompromissoRecord } from '../agenda/compromisso.schema.js';
import type { FinanceiroRelatorio, PericiaFinanceiroResumo } from '../financeiro/lancamento.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import type { PericiaParada, PericiaRecord } from '../pericia/pericia.schema.js';
import type { PrazoRecord } from '../pericia/prazo.schema.js';

export type { DocumentIdentity, FinanceiroReportQuery };
export { financeiroReportQuerySchema };

export const documentoPericiaParamSchema = z.object({ id: idSchema }).strict();

export type DocumentosRouterDeps = { validToken: RequestHandler; pdf: PdfRenderer; storage?: FileStorage };

// Quem gera o documento: o nome vai no [NOME_PERITO] e os dados profissionais na ficha.
// `canSeeFinance` decide se a ficha mostra valores (AD-107, AD-121).
export type DocumentoContexto = {
  tenantId: string;
  userId: string;
  canSeeFinance: boolean;
  now: Date;
};

export type DocumentoBase = { identity: DocumentIdentity; perito: AccountView; geradoEm: Date };

export type FichaDados = DocumentoBase & {
  pericia: PericiaRecord;
  prazos: PrazoRecord[];
  compromissos: CompromissoRecord[];
  financeiro?: PericiaFinanceiroResumo;
};

export type ChecklistDados = DocumentoBase & { pericia: PericiaRecord };

export type CronogramaDados = DocumentoBase & { prazos: PrazoRecord[]; hoje: string };

export type FinanceiroDados = DocumentoBase & { periodo: FinanceiroReportQuery; relatorio: FinanceiroRelatorio };

export type ParadasDados = DocumentoBase & { paradas: PericiaParada[] };

export type ArquivoGerado = { nome: string; tipo: string; conteudo: Buffer };
