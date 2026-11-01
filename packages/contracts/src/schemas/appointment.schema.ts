import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

export const APPOINTMENT_TYPES = ['inspection', 'hearing', 'meeting', 'other'] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUS = ['scheduled', 'done', 'canceled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

// Why the appointment was canceled in the field (AD-130): postponed or absent party.
export const APPOINTMENT_REASONS = ['postponed', 'absent'] as const;
export type AppointmentReason = (typeof APPOINTMENT_REASONS)[number];

// Date and time arrive as wall-clock time; the service converts them to the UTC instant.
export const createAppointmentSchema = z
  .object({
    type: z.enum(APPOINTMENT_TYPES),
    title: z.string().trim().min(1, 'título é obrigatório').max(160, 'título inválido'),
    date: calendarDateSchema,
    time: wallTimeSchema,
    durationMinutes: z
      .number()
      .int()
      .min(15)
      .max(24 * 60),
    location: z.string().trim().max(200, 'local inválido').optional(),
    caseId: idSchema.optional(),
    notes: z.string().trim().max(1000, 'observações inválidas').optional(),
  })
  .strict();
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema
  .partial()
  .extend({ status: z.enum(APPOINTMENT_STATUS).optional(), reason: z.enum(APPOINTMENT_REASONS).optional() })
  .strict();
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
