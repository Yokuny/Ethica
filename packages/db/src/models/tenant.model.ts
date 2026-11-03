import { type DocumentTextStyle, REPORT_FONTS, TEXT_ALIGNMENTS } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export type TenantStatus = 'provisioned' | 'active' | 'suspended';

export interface TenantDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  document: string;
  status: TenantStatus;
  // Document identity (AD-121): text with markers, replaced when the PDF is generated.
  header?: string;
  footer?: string;
  // Font, size and alignment of each one (AD-172); without them the default applies.
  headerStyle?: DocumentTextStyle;
  footerStyle?: DocumentTextStyle;
  // Files in S3 storage (AD-120). `storageBytes` is the total used, reserved in the same
  // update that saves the file reference, to respect the tenant quota.
  logo?: { key: string; bytes: number; updatedAt: Date };
  storageBytes: number;
  // Template of the schedule notice to the parties (AD-131); without it the server default applies.
  scheduleNotice?: { subject: string; body: string };
  createdAt: Date;
  updatedAt: Date;
}

const textStyleSchema = {
  type: new Schema(
    {
      font: { type: String, enum: REPORT_FONTS, required: true },
      fontSize: { type: Number, min: 6, max: 16, required: true },
      align: { type: String, enum: TEXT_ALIGNMENTS, required: true },
    },
    { _id: false },
  ),
  required: false,
};

const tenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, minlength: 3, maxlength: 120, required: true },
    document: { type: String, required: true, unique: true, match: /^\d+$/ },
    status: {
      type: String,
      enum: ['provisioned', 'active', 'suspended'],
      default: 'provisioned',
      required: true,
    },
    header: { type: String, maxlength: 1000 },
    footer: { type: String, maxlength: 1000 },
    headerStyle: textStyleSchema,
    footerStyle: textStyleSchema,
    logo: {
      type: new Schema(
        { key: { type: String, required: true }, bytes: { type: Number, required: true }, updatedAt: Date },
        { _id: false },
      ),
      required: false,
    },
    storageBytes: { type: Number, min: 0, default: 0, required: true },
    scheduleNotice: { type: new Schema({ subject: String, body: String }, { _id: false }) },
  },
  { timestamps: true },
);

export const Tenant = mongoose.model<TenantDocument>('Tenant', tenantSchema);

// The transition guard is the query itself: it only updates if the current status is
// exactly `from`. A caller outside the state machine (from does not match the
// real status) gets null — no business rule `if` here.
export const transitionTenantStatus = async (
  id: string,
  from: TenantStatus,
  to: TenantStatus,
): Promise<TenantDocument | null> => {
  return Tenant.findOneAndUpdate({ _id: id, status: from }, { status: to }, { returnDocument: 'after' }).lean();
};
