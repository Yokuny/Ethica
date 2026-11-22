import {
  NOTIFICATION_KINDS,
  NOTIFICATION_MODULES,
  NOTIFICATION_SOURCES,
  NOTIFICATION_STATUS,
  type NotificationKind,
  type NotificationModule,
  type NotificationSource,
  type NotificationStatus,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// One schema for the four kinds (AD-263): the fields of each kind are optional here and the shape per
// kind is the Zod union of `@ethica/contracts`. The fields enter with the phase that uses them.
export interface NotificationDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  kind: NotificationKind;
  module: NotificationModule;
  source: NotificationSource;
  // A notice has no status (read per person).
  status?: NotificationStatus;
  Case?: mongoose.Types.ObjectId;
  title?: string;
  // Calendar dates `YYYY-MM-DD` in the display time zone (AD-103): a deadline is a day, not an instant.
  dueDate?: string;
  filedDate?: string;
  notes?: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDated = (kind: NotificationKind): boolean => kind === 'deadline' || kind === 'alert';

const notificationSchema = new Schema<NotificationDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    module: { type: String, enum: NOTIFICATION_MODULES, required: true },
    source: { type: String, enum: NOTIFICATION_SOURCES, required: true },
    status: { type: String, enum: NOTIFICATION_STATUS },
    Case: { type: Schema.Types.ObjectId, ref: 'Case' },
    title: { type: String, trim: true },
    dueDate: { type: String, match: DAY },
    filedDate: { type: String, match: DAY },
    notes: { type: String },
    readBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true },
);

notificationSchema.pre('validate', function () {
  if (isDated(this.kind)) {
    for (const field of ['Case', 'title', 'dueDate', 'status'] as const) {
      if (!this[field]) this.invalidate(field, `${this.kind} precisa de ${field}`);
    }
  }
  if (this.status === 'filed' && !this.filedDate) {
    this.invalidate('filedDate', 'prazo protocolado precisa da data de protocolo');
  }
});

// Central and counters; case detail; the reminder scan across tenants (worker, AD-267).
notificationSchema.index({ Tenant: 1, kind: 1, status: 1, dueDate: 1 });
notificationSchema.index({ Tenant: 1, Case: 1, kind: 1, dueDate: 1 });
notificationSchema.index({ status: 1, dueDate: 1 });

export const Notification = mongoose.model<NotificationDocument>('Notification', notificationSchema);
