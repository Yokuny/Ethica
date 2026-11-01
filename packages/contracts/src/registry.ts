import type { ZodType } from 'zod';
import { acceptInviteSchema } from './schemas/acceptInvite.schema.js';
import { changePasswordSchema, updateAvatarSchema, updateProfileSchema } from './schemas/account.schema.js';
import { createAppointmentSchema, updateAppointmentSchema } from './schemas/appointment.schema.js';
import {
  createCaseSchema,
  createMovementSchema,
  processNumberSchema,
  updateCaseSchema,
} from './schemas/case.schema.js';
import { createInviteSchema } from './schemas/createInvite.schema.js';
import { calendarDateSchema, wallTimeSchema } from './schemas/date.schema.js';
import { createDeadlineSchema, updateDeadlineSchema } from './schemas/deadline.schema.js';
import { listDiarioQuerySchema } from './schemas/diario.schema.js';
import { financeReportQuerySchema, updateOfficeSchema, updateScheduleNoticeSchema } from './schemas/document.schema.js';
import { idSchema } from './schemas/id.schema.js';
import {
  inspectionDataSchema,
  mediaIdSchema,
  saveInspectionSchema,
  updateMediaSchema,
} from './schemas/inspection.schema.js';
import { inviteTokenParamSchema } from './schemas/inviteToken.schema.js';
import { listStatsSchema } from './schemas/listStats.schema.js';
import {
  casePartyInputSchema,
  createPartySchema,
  documentSchema,
  oabSchema,
  updatePartySchema,
} from './schemas/party.schema.js';
import { permissoesSchema, updatePermissoesSchema } from './schemas/permissao.schema.js';
import {
  createOportunidadeSchema,
  datajudSearchSchema,
  updateOportunidadeSchema,
} from './schemas/prospeccao.schema.js';
import { provisionTenantSchema } from './schemas/provisionTenant.schema.js';
import {
  completeReportSchema,
  createReportSchema,
  createTemplateSchema,
  moveSectionSchema,
  templateSectionSchema,
  updateReportSectionSchema,
  updateTemplateSchema,
} from './schemas/report.schema.js';
import { signinSchema } from './schemas/signin.schema.js';
import {
  createInstallmentSchema,
  createTransactionSchema,
  updateTransactionSchema,
} from './schemas/transaction.schema.js';

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
  { name: 'processNumberSchema', schema: processNumberSchema },
  { name: 'createCaseSchema', schema: createCaseSchema },
  { name: 'updateCaseSchema', schema: updateCaseSchema },
  { name: 'createMovementSchema', schema: createMovementSchema },
  { name: 'updateOfficeSchema', schema: updateOfficeSchema },
  { name: 'financeReportQuerySchema', schema: financeReportQuerySchema },
  { name: 'documentSchema', schema: documentSchema },
  { name: 'oabSchema', schema: oabSchema },
  { name: 'createPartySchema', schema: createPartySchema },
  { name: 'updatePartySchema', schema: updatePartySchema },
  { name: 'casePartyInputSchema', schema: casePartyInputSchema },
  { name: 'createTemplateSchema', schema: createTemplateSchema },
  { name: 'updateTemplateSchema', schema: updateTemplateSchema },
  { name: 'templateSectionSchema', schema: templateSectionSchema },
  { name: 'moveSectionSchema', schema: moveSectionSchema },
  { name: 'createReportSchema', schema: createReportSchema },
  { name: 'updateReportSectionSchema', schema: updateReportSectionSchema },
  { name: 'completeReportSchema', schema: completeReportSchema },
  { name: 'createDeadlineSchema', schema: createDeadlineSchema },
  { name: 'updateDeadlineSchema', schema: updateDeadlineSchema },
  { name: 'createAppointmentSchema', schema: createAppointmentSchema },
  { name: 'updateAppointmentSchema', schema: updateAppointmentSchema },
  { name: 'createTransactionSchema', schema: createTransactionSchema },
  { name: 'updateTransactionSchema', schema: updateTransactionSchema },
  { name: 'createInstallmentSchema', schema: createInstallmentSchema },
  { name: 'datajudSearchSchema', schema: datajudSearchSchema },
  { name: 'createOportunidadeSchema', schema: createOportunidadeSchema },
  { name: 'updateOportunidadeSchema', schema: updateOportunidadeSchema },
  { name: 'updateScheduleNoticeSchema', schema: updateScheduleNoticeSchema },
  { name: 'mediaIdSchema', schema: mediaIdSchema },
  { name: 'inspectionDataSchema', schema: inspectionDataSchema },
  { name: 'saveInspectionSchema', schema: saveInspectionSchema },
  { name: 'updateMediaSchema', schema: updateMediaSchema },
  { name: 'permissoesSchema', schema: permissoesSchema },
  { name: 'updatePermissoesSchema', schema: updatePermissoesSchema },
  { name: 'listDiarioQuerySchema', schema: listDiarioQuerySchema },
];
