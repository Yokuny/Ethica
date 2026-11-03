import mongoose, { Schema } from 'mongoose';

// Technical responsible who signs reports (NLA-02): a registry of the office, without access to Ethica.
// Empty header, footer or logo fall back to the office ones (AD-121).
export interface SignatoryDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  name: string;
  cpf?: string;
  professionalRegistration?: string;
  education?: string;
  phone?: string;
  header?: string;
  footer?: string;
  // PNG in the S3 storage, counted in the tenant quota (AD-120).
  logo?: { key: string; bytes: number; updatedAt: Date };
  createdAt: Date;
  updatedAt: Date;
}

const signatorySchema = new Schema<SignatoryDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    cpf: { type: String, match: /^\d{11}$/ },
    professionalRegistration: { type: String, trim: true },
    education: { type: String, trim: true },
    phone: { type: String, trim: true },
    header: { type: String, maxlength: 1000 },
    footer: { type: String, maxlength: 1000 },
    logo: {
      type: new Schema(
        { key: { type: String, required: true }, bytes: { type: Number, required: true }, updatedAt: Date },
        { _id: false },
      ),
    },
  },
  { timestamps: true },
);

signatorySchema.index({ Tenant: 1, name: 1 });

export const Signatory = mongoose.model<SignatoryDocument>('Signatory', signatorySchema);
