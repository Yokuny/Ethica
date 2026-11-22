import mongoose, { Schema } from 'mongoose';

// Push on a device (AVS-03, CNT-06): one inscription per browser of the person. The api saves and removes it
// (the person turns it on in the account, signing out removes it); the worker reads it and drops the ones the
// push service answers as gone.
export interface PushSubscriptionDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  User: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    User: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true },
    keys: {
      type: new Schema(
        { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
        { _id: false },
      ),
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ User: 1 });

export const PushSubscription = mongoose.model<PushSubscriptionDocument>('PushSubscription', pushSubscriptionSchema);
