import type { ZodType } from 'zod';
import { acceptInviteSchema } from './schemas/acceptInvite.schema.js';
import { changePasswordSchema, updateAvatarSchema, updateProfileSchema } from './schemas/account.schema.js';
import { createCompromissoSchema, updateCompromissoSchema } from './schemas/compromisso.schema.js';
import { createInviteSchema } from './schemas/createInvite.schema.js';
import { calendarDateSchema, wallTimeSchema } from './schemas/date.schema.js';
import { idSchema } from './schemas/id.schema.js';
import { inviteTokenParamSchema } from './schemas/inviteToken.schema.js';
import { createLancamentoSchema, createParcelaSchema, updateLancamentoSchema } from './schemas/lancamento.schema.js';
import { listStatsSchema } from './schemas/listStats.schema.js';
import {
  createParteSchema,
  documentoSchema,
  oabSchema,
  periciaParteInputSchema,
  updateParteSchema,
} from './schemas/parte.schema.js';
import { createPericiaSchema, numeroProcessoSchema, updatePericiaSchema } from './schemas/pericia.schema.js';
import { createPrazoSchema, updatePrazoSchema } from './schemas/prazo.schema.js';
import {
  createOportunidadeSchema,
  datajudSearchSchema,
  updateOportunidadeSchema,
} from './schemas/prospeccao.schema.js';
import { provisionTenantSchema } from './schemas/provisionTenant.schema.js';
import { signinSchema } from './schemas/signin.schema.js';

export const TENANT_FORBIDDEN_KEYS = [
  'tenant',
  'tenantid',
  'tenant_id',
  'orgid',
  'org_id',
  'clinic',
  'company',
] as const;

// Todo schema Zod exportado de um *.schema.ts entra aqui: o teste estrutural
// (tests/structural/schema-registry.structural.test.ts) varre o repo, falha no
// schema esquecido e garante que nenhum aceita chave de tenant (AD-010).
export const schemaRegistry: ReadonlyArray<{ name: string; schema: ZodType }> = [
  { name: 'provisionTenantSchema', schema: provisionTenantSchema },
  { name: 'createInviteSchema', schema: createInviteSchema },
  { name: 'acceptInviteSchema', schema: acceptInviteSchema },
  { name: 'updateProfileSchema', schema: updateProfileSchema },
  { name: 'changePasswordSchema', schema: changePasswordSchema },
  { name: 'updateAvatarSchema', schema: updateAvatarSchema },
  { name: 'signinSchema', schema: signinSchema },
  { name: 'idSchema', schema: idSchema },
  { name: 'inviteTokenParamSchema', schema: inviteTokenParamSchema },
  { name: 'listStatsSchema', schema: listStatsSchema },
  { name: 'calendarDateSchema', schema: calendarDateSchema },
  { name: 'wallTimeSchema', schema: wallTimeSchema },
  { name: 'numeroProcessoSchema', schema: numeroProcessoSchema },
  { name: 'createPericiaSchema', schema: createPericiaSchema },
  { name: 'updatePericiaSchema', schema: updatePericiaSchema },
  { name: 'documentoSchema', schema: documentoSchema },
  { name: 'oabSchema', schema: oabSchema },
  { name: 'createParteSchema', schema: createParteSchema },
  { name: 'updateParteSchema', schema: updateParteSchema },
  { name: 'periciaParteInputSchema', schema: periciaParteInputSchema },
  { name: 'createPrazoSchema', schema: createPrazoSchema },
  { name: 'updatePrazoSchema', schema: updatePrazoSchema },
  { name: 'createCompromissoSchema', schema: createCompromissoSchema },
  { name: 'updateCompromissoSchema', schema: updateCompromissoSchema },
  { name: 'createLancamentoSchema', schema: createLancamentoSchema },
  { name: 'updateLancamentoSchema', schema: updateLancamentoSchema },
  { name: 'createParcelaSchema', schema: createParcelaSchema },
  { name: 'datajudSearchSchema', schema: datajudSearchSchema },
  { name: 'createOportunidadeSchema', schema: createOportunidadeSchema },
  { name: 'updateOportunidadeSchema', schema: updateOportunidadeSchema },
];
