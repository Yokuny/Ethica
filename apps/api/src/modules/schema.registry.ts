import type { ZodType } from 'zod';
import {
  compromissoIdParamSchema,
  listCompromissosQuerySchema,
  upcomingCompromissosQuerySchema,
} from './agenda/compromisso.schema.js';
import {
  categoriasQuerySchema,
  fluxoQuerySchema,
  lancamentoIdParamSchema,
  listLancamentosQuerySchema,
} from './financeiro/lancamento.schema.js';
import { listUsersQuerySchema, userDirectoryQuerySchema, userIdParamSchema } from './identity/auth.schema.js';
import { tenantIdParamSchema } from './identity/platform.schema.js';
import { updatePreferencesSchema } from './identity/preferences.schema.js';
import { listPericiasQuerySchema, periciaIdParamSchema } from './pericia/pericia.schema.js';
import { listPrazosPendentesQuerySchema, prazoIdParamSchema } from './pericia/prazo.schema.js';
import {
  converterOportunidadeSchema,
  listOportunidadesQuerySchema,
  oportunidadeIdParamSchema,
} from './prospeccao/oportunidade.schema.js';

// Schemas Zod locais dos módulos (params/query dos routers, em
// `<entidade>.schema.ts`). Mesmo shape do schemaRegistry de @ethica/contracts,
// que não pode importar de apps/ — o schema-registry.structural valida a
// união dos dois.
export const apiSchemaRegistry: ReadonlyArray<{ name: string; schema: ZodType }> = [
  { name: 'tenantIdParamSchema', schema: tenantIdParamSchema },
  { name: 'listUsersQuerySchema', schema: listUsersQuerySchema },
  { name: 'userDirectoryQuerySchema', schema: userDirectoryQuerySchema },
  { name: 'userIdParamSchema', schema: userIdParamSchema },
  { name: 'updatePreferencesSchema', schema: updatePreferencesSchema },
  { name: 'periciaIdParamSchema', schema: periciaIdParamSchema },
  { name: 'listPericiasQuerySchema', schema: listPericiasQuerySchema },
  { name: 'prazoIdParamSchema', schema: prazoIdParamSchema },
  { name: 'listPrazosPendentesQuerySchema', schema: listPrazosPendentesQuerySchema },
  { name: 'compromissoIdParamSchema', schema: compromissoIdParamSchema },
  { name: 'listCompromissosQuerySchema', schema: listCompromissosQuerySchema },
  { name: 'upcomingCompromissosQuerySchema', schema: upcomingCompromissosQuerySchema },
  { name: 'lancamentoIdParamSchema', schema: lancamentoIdParamSchema },
  { name: 'listLancamentosQuerySchema', schema: listLancamentosQuerySchema },
  { name: 'fluxoQuerySchema', schema: fluxoQuerySchema },
  { name: 'categoriasQuerySchema', schema: categoriasQuerySchema },
  { name: 'oportunidadeIdParamSchema', schema: oportunidadeIdParamSchema },
  { name: 'listOportunidadesQuerySchema', schema: listOportunidadesQuerySchema },
  { name: 'converterOportunidadeSchema', schema: converterOportunidadeSchema },
];
