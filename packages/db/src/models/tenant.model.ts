import { type DocumentTextStyle, REPORT_FONTS, TEXT_ALIGNMENTS } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

export type TenantStatus = 'provisioned' | 'active' | 'suspended';

// AD-230: Asaas data the payment reconciliation needs.
export type TenantBilling = {
  customerId?: string;
  subscriptionId?: string;
  subscriptionPlan?: 'monthly' | 'yearly';
  trialPaymentId?: string;
  trialInvoiceUrl?: string;
  paidAt?: Date;
  pendingSince?: Date;
};

export interface TenantDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  document: string;
  status: TenantStatus;
  // AD-230: access only before this instant; absent = no subscription control (test and platform offices).
  accessUntil?: Date;
  billing?: TenantBilling;
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
  // Revenue goals, one per year (MRA-01, AD-258, AD-259).
  revenueGoals?: { year: number; amountCents: number }[];
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
    accessUntil: Date,
    billing: {
      type: new Schema(
        {
          customerId: String,
          subscriptionId: String,
          subscriptionPlan: { type: String, enum: ['monthly', 'yearly'] },
          trialPaymentId: String,
          trialInvoiceUrl: String,
          paidAt: Date,
          // AD-251: a charge was created and may be paid; the plans screen checks Asaas while it is set.
          pendingSince: Date,
        },
        { _id: false },
      ),
      required: false,
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
    revenueGoals: {
      type: [
        new Schema(
          { year: { type: Number, required: true }, amountCents: { type: Number, min: 1, required: true } },
          { _id: false },
        ),
      ],
      default: undefined,
    },
  },
  { timestamps: true },
);

// The Asaas webhook finds the office by its customer.
tenantSchema.index({ 'billing.customerId': 1 }, { unique: true, sparse: true });

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

// AD-230: the single rule of an office that can be used — not suspended by the platform (AD-098) and,
// with a subscription, inside the paid access. Session, iCal feed and daily reminder read it.
export const isTenantOpen = (tenant: { status: string; accessUntil?: Date }, now = new Date()): boolean =>
  tenant.status !== 'suspended' && (!tenant.accessUntil || tenant.accessUntil > now);

export const openTenantFilter = (now = new Date()) => ({
  status: { $ne: 'suspended' as const },
  $or: [{ accessUntil: { $exists: false } }, { accessUntil: { $gt: now } }],
});
