import type { ZodType } from 'zod';
import {
  appointmentIdParamSchema,
  listAppointmentsQuerySchema,
  upcomingAppointmentsQuerySchema,
} from './agenda/appointment.schema.js';
import { feedTokenParamSchema } from './agenda/feed.schema.js';
import {
  inspectionCaseParamSchema,
  inspectionDayQuerySchema,
  inspectionMediaParamSchema,
  inspectionParamSchema,
  mediaUploadQuerySchema,
} from './agenda/inspection.schema.js';
import { caseIdParamSchema, listCasesQuerySchema, movementIdParamSchema } from './case/case.schema.js';
import { deadlineIdParamSchema, listPendingDeadlinesQuerySchema } from './case/deadline.schema.js';
import { listPartiesQuerySchema, partyIdParamSchema } from './case/party.schema.js';
import { documentCaseParamSchema } from './documentos/documentos.schema.js';
import {
  laudoIdParamSchema,
  laudoSecaoParamSchema,
  listLaudosQuerySchema,
  listModelosQuerySchema,
  modeloIdParamSchema,
  modeloSecaoParamSchema,
} from './documentos/laudo.schema.js';
import {
  categoriasQuerySchema,
  fluxoQuerySchema,
  lancamentoIdParamSchema,
  listLancamentosQuerySchema,
  parcelaIdParamSchema,
} from './financeiro/lancamento.schema.js';
import { listUsersQuerySchema, userDirectoryQuerySchema, userIdParamSchema } from './identity/auth.schema.js';
import { tenantIdParamSchema } from './identity/platform.schema.js';
import { updatePreferencesSchema } from './identity/preferences.schema.js';
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
  { name: 'caseIdParamSchema', schema: caseIdParamSchema },
  { name: 'listCasesQuerySchema', schema: listCasesQuerySchema },
  { name: 'movementIdParamSchema', schema: movementIdParamSchema },
  { name: 'documentCaseParamSchema', schema: documentCaseParamSchema },
  { name: 'inspectionParamSchema', schema: inspectionParamSchema },
  { name: 'inspectionMediaParamSchema', schema: inspectionMediaParamSchema },
  { name: 'inspectionCaseParamSchema', schema: inspectionCaseParamSchema },
  { name: 'inspectionDayQuerySchema', schema: inspectionDayQuerySchema },
  { name: 'mediaUploadQuerySchema', schema: mediaUploadQuerySchema },
  { name: 'modeloIdParamSchema', schema: modeloIdParamSchema },
  { name: 'modeloSecaoParamSchema', schema: modeloSecaoParamSchema },
  { name: 'laudoIdParamSchema', schema: laudoIdParamSchema },
  { name: 'laudoSecaoParamSchema', schema: laudoSecaoParamSchema },
  { name: 'listModelosQuerySchema', schema: listModelosQuerySchema },
  { name: 'listLaudosQuerySchema', schema: listLaudosQuerySchema },
  { name: 'partyIdParamSchema', schema: partyIdParamSchema },
  { name: 'listPartiesQuerySchema', schema: listPartiesQuerySchema },
  { name: 'deadlineIdParamSchema', schema: deadlineIdParamSchema },
  { name: 'listPendingDeadlinesQuerySchema', schema: listPendingDeadlinesQuerySchema },
  { name: 'appointmentIdParamSchema', schema: appointmentIdParamSchema },
  { name: 'listAppointmentsQuerySchema', schema: listAppointmentsQuerySchema },
  { name: 'upcomingAppointmentsQuerySchema', schema: upcomingAppointmentsQuerySchema },
  { name: 'feedTokenParamSchema', schema: feedTokenParamSchema },
  { name: 'lancamentoIdParamSchema', schema: lancamentoIdParamSchema },
  { name: 'listLancamentosQuerySchema', schema: listLancamentosQuerySchema },
  { name: 'parcelaIdParamSchema', schema: parcelaIdParamSchema },
  { name: 'fluxoQuerySchema', schema: fluxoQuerySchema },
  { name: 'categoriasQuerySchema', schema: categoriasQuerySchema },
  { name: 'oportunidadeIdParamSchema', schema: oportunidadeIdParamSchema },
  { name: 'listOportunidadesQuerySchema', schema: listOportunidadesQuerySchema },
  { name: 'converterOportunidadeSchema', schema: converterOportunidadeSchema },
];
