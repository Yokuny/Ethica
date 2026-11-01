import {
  REPORT_LEVEL_MAX,
  REPORT_STATUS,
  REPORT_TYPES,
  REPORT_VARIANTS,
  type ReportStatus,
  type ReportType,
  type ReportVariant,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Report section: copy of the template section in the chosen variant, with the variables already
// resolved on opening (AD-126). Changing the template afterwards does not change the report.
export interface ReportSectionDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  level: number;
  titleOnly: boolean;
  pageBreak: boolean;
  variant: ReportVariant;
  html: string;
}

export interface ReportDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Case: mongoose.Types.ObjectId;
  type: ReportType;
  status: ReportStatus;
  title: string;
  templateName: string;
  sections: ReportSectionDocument[];
  CreatedBy: mongoose.Types.ObjectId;
  CompletedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ReportSectionDocument>({
  title: { type: String, required: true, trim: true },
  level: { type: Number, required: true, min: 1, max: REPORT_LEVEL_MAX },
  titleOnly: { type: Boolean, default: false },
  pageBreak: { type: Boolean, default: false },
  variant: { type: String, enum: REPORT_VARIANTS, required: true },
  html: { type: String, default: '' },
});

const reportSchema = new Schema<ReportDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    type: { type: String, enum: REPORT_TYPES, required: true },
    status: { type: String, enum: REPORT_STATUS, default: 'draft', required: true },
    title: { type: String, required: true, trim: true },
    templateName: { type: String, required: true, trim: true },
    sections: { type: [sectionSchema], default: [] },
    CreatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    CompletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

reportSchema.index({ Tenant: 1, Case: 1 });
reportSchema.index({ Tenant: 1, status: 1, updatedAt: -1 });

export const Report = mongoose.model<ReportDocument>('Report', reportSchema);
