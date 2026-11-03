import mongoose, { Schema } from 'mongoose';

// Service order sequence of the office (NLA-01): `last` is the last number used in `year`; another
// year starts again at 1. One per tenant.
export interface ServiceOrderSequenceDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  prefix: string;
  year: number;
  last: number;
  createdAt: Date;
  updatedAt: Date;
}

const serviceOrderSequenceSchema = new Schema<ServiceOrderSequenceDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    prefix: { type: String, required: true, match: /^[A-Z0-9]{1,10}$/ },
    year: { type: Number, required: true },
    last: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: 'service_order_sequences' },
);

serviceOrderSequenceSchema.index({ Tenant: 1 }, { unique: true });

export const ServiceOrderSequence = mongoose.model<ServiceOrderSequenceDocument>(
  'ServiceOrderSequence',
  serviceOrderSequenceSchema,
);
