import { SERVICE_ORDER_PATTERN_DEFAULT } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Service order sequence of the office (NLA-01): `last` is the last number used in `year`; another
// year starts again at 1 when the `pattern` has `[ANO]` (AD-172). One per tenant.
export interface ServiceOrderSequenceDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  pattern: string;
  prefix: string;
  digits: number;
  year: number;
  last: number;
  createdAt: Date;
  updatedAt: Date;
}

const serviceOrderSequenceSchema = new Schema<ServiceOrderSequenceDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    pattern: { type: String, required: true, default: SERVICE_ORDER_PATTERN_DEFAULT, maxlength: 40 },
    prefix: { type: String, default: '', match: /^[A-Z0-9]{0,10}$/ },
    digits: { type: Number, required: true, default: 3, min: 1, max: 6 },
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
