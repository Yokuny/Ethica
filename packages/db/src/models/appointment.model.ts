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
  tipo: AppointmentType;
  titulo: string;
  // Instantes em UTC (AD-036, AD-103); a tela converte para o fuso de exibição.
  inicio: Date;
  fim: Date;
  local?: string;
  Case?: mongoose.Types.ObjectId;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  observacoes?: string;
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
    tipo: { type: String, enum: APPOINTMENT_TYPES, required: true },
    titulo: { type: String, required: true, trim: true },
    inicio: { type: Date, required: true },
    fim: { type: Date, required: true },
    local: { type: String, trim: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
    status: { type: String, enum: APPOINTMENT_STATUS, default: 'scheduled', required: true },
    origin: { type: String, enum: ['manual', 'automatic'], default: 'manual', required: true },
    observacoes: { type: String },
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
  if (this.fim && this.inicio && this.fim <= this.inicio) this.invalidate('fim', 'fim precisa ser depois do início');
});

// Consulta da agenda é sempre por intervalo [from, to) do tenant.
appointmentSchema.index({ Tenant: 1, inicio: 1 });
appointmentSchema.index({ Tenant: 1, Case: 1, inicio: 1 });

export const Appointment = mongoose.model<AppointmentDocument>('Appointment', appointmentSchema);
