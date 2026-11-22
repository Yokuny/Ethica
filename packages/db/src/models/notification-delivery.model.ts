import { NOTIFICATION_CHANNELS, type NotificationChannel } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Delivery lock (AD-147, AD-267): one e-mail per person × channel × key (`digest:<day>`, `immediate:<id>`).
// The worker inserts it BEFORE sending (the unique index is the lock), marks `sentAt` after, and deletes it
// when the send fails, so the next sweep tries again. A claim without `sentAt` older than the lease is taken over.
export interface NotificationDeliveryDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  User: mongoose.Types.ObjectId;
  channel: NotificationChannel;
  key: string;
  claimedAt: Date;
  sentAt?: Date;
}

const notificationDeliverySchema = new Schema<NotificationDeliveryDocument>({
  Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  User: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
  key: { type: String, required: true },
  claimedAt: { type: Date, required: true },
  sentAt: { type: Date },
});

notificationDeliverySchema.index({ User: 1, channel: 1, key: 1 }, { unique: true });
// The lock only matters for a few days.
notificationDeliverySchema.index({ claimedAt: 1 }, { expireAfterSeconds: 90 * 86_400 });

export const NotificationDelivery = mongoose.model<NotificationDeliveryDocument>(
  'NotificationDelivery',
  notificationDeliverySchema,
);
