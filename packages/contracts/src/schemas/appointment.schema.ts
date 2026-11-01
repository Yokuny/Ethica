import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

export const APPOINTMENT_TYPES = ['inspection', 'hearing', 'meeting', 'other'] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUS = ['scheduled', 'done', 'canceled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

// Por que o compromisso foi cancelado no campo (AD-130): adiado ou parte ausente.
export const APPOINTMENT_REASONS = ['postponed', 'absent'] as const;
export type AppointmentReason = (typeof APPOINTMENT_REASONS)[number];

// Data e hora chegam em hora de parede; o service converte para o instante UTC.
export const createAppointmentSchema = z
  .object({
    tipo: z.enum(APPOINTMENT_TYPES),
    titulo: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
    date: calendarDateSchema,
    time: wallTimeSchema,
    durationMinutes: z
      .number()
      .int()
      .min(15)
      .max(24 * 60),
    local: z.string().trim().max(200, 'local inválido').optional(),
    caseId: idSchema.optional(),
    observacoes: z.string().trim().max(1000, 'observações inválidas').optional(),
  })
  .strict();
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema
  .partial()
  .extend({ status: z.enum(APPOINTMENT_STATUS).optional(), reason: z.enum(APPOINTMENT_REASONS).optional() })
  .strict();
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
