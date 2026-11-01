import {
  APPOINTMENT_REASONS,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPES,
  type AppointmentReason,
  type AppointmentStatus,
  type AppointmentType,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export type AppointmentOrigin = 'manual' | 'automatic';

export interface AppointmentDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  type: AppointmentType;
  title: string;
  // Instantes em UTC (AD-036, AD-103); a tela converte para o fuso de exibição.
  start: Date;
  end: Date;
  location?: string;
  Case?: mongoose.Types.ObjectId;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  notes?: string;
  // Cancelado no campo: adiado ou parte ausente (AD-130).
  reason?: AppointmentReason;
  // Geocodificação do `local` (AD-131), válida enquanto `endereco` for igual ao `local`.
  coordinates?: { lat: number; lng: number; address: string };
  // Avisos de agendamento enviados às partes (AD-131).
  notices: Array<{ User: mongoose.Types.ObjectId; at: Date; recipients: string[] }>;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    type: { type: String, enum: APPOINTMENT_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    location: { type: String, trim: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
    status: { type: String, enum: APPOINTMENT_STATUS, default: 'scheduled', required: true },
    origin: { type: String, enum: ['manual', 'automatic'], default: 'manual', required: true },
    notes: { type: String },
    reason: { type: String, enum: APPOINTMENT_REASONS },
    coordinates: { type: new Schema({ lat: Number, lng: Number, address: String }, { _id: false }) },
    notices: {
      type: [
        new Schema(
          { User: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, recipients: [String] },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

appointmentSchema.pre('validate', function () {
  if (this.end && this.start && this.end <= this.start) this.invalidate('end', 'fim precisa ser depois do início');
});

// Consulta da agenda é sempre por intervalo [from, to) do tenant.
appointmentSchema.index({ Tenant: 1, start: 1 });
appointmentSchema.index({ Tenant: 1, Case: 1, start: 1 });

export const Appointment = mongoose.model<AppointmentDocument>('Appointment', appointmentSchema);
