import {
  REPORT_LEVEL_MAX,
  REPORT_STATUS,
  REPORT_TYPES,
  REPORT_VARIANTS,
  type ReportLayout,
  type ReportStatus,
  type ReportType,
  type ReportVariant,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Report section: copy of the template section in the chosen variant, with the variables already
// resolved on opening (AD-126). Changing the template afterwards does not change the report.
export interface ReportSectionDocument {
  _id: mongoose.Types.ObjectId;
  // Template section it came from (LMO-01): keeps the edited text when the choice is redone.
  templateSectionId?: string;
  title: string;
  level: number;
  titleOnly: boolean;
  pageBreak: boolean;
  unnumbered: boolean;
  // Unchecked "Faz parte do laudo" (NLA-05): stays in the draft, out of PDF and Word.
  included: boolean;
  variant: ReportVariant;
  html: string;
}

// Photo sent in the report itself (LMO-05); the HTML points to it by `id`.
export interface ReportMediaDocument {
  id: string;
  key: string;
  bytes: number;
  mime: string;
  createdAt: Date;
}

// PDF of a report made outside the Ethica (ANL-02): the report is born completed, without sections.
export interface ReportFileDocument {
  key: string;
  name: string;
  bytes: number;
}

export interface ReportDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  Case: mongoose.Types.ObjectId;
  // Technical responsible who signs (NLA-02); missing = the user who created it.
  Signatory?: mongoose.Types.ObjectId;
  type: ReportType;
  status: ReportStatus;
  title: string;
  templateId?: string;
  templateName: string;
  sections: ReportSectionDocument[];
  media: ReportMediaDocument[];
  file?: ReportFileDocument;
  // Missing = REPORT_LAYOUT_DEFAULT (NLA-06).
  layout?: ReportLayout;
  CreatedBy: mongoose.Types.ObjectId;
  CompletedBy?: mongoose.Types.ObjectId;
  // Last user who wrote in the report; missing in reports saved before this field.
  UpdatedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ReportSectionDocument>({
  templateSectionId: { type: String },
  title: { type: String, required: true, trim: true },
  level: { type: Number, required: true, min: 1, max: REPORT_LEVEL_MAX },
  titleOnly: { type: Boolean, default: false },
  pageBreak: { type: Boolean, default: false },
  unnumbered: { type: Boolean, default: false },
  included: { type: Boolean, default: true },
  variant: { type: String, enum: REPORT_VARIANTS, required: true },
  html: { type: String, default: '' },
});

const mediaSchema = new Schema<ReportMediaDocument>(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0 },
    mime: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const fileSchema = new Schema<ReportFileDocument>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    bytes: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const reportSchema = new Schema<ReportDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    Case: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    Signatory: { type: Schema.Types.ObjectId, ref: 'Signatory' },
    type: { type: String, enum: REPORT_TYPES, required: true },
    status: { type: String, enum: REPORT_STATUS, default: 'draft', required: true },
    title: { type: String, required: true, trim: true },
    templateId: { type: String },
    templateName: { type: String, required: true, trim: true },
    sections: { type: [sectionSchema], default: [] },
    media: { type: [mediaSchema], default: [] },
    file: { type: fileSchema },
    layout: { type: Schema.Types.Mixed },
    CreatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    CompletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    UpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

reportSchema.index({ Tenant: 1, Case: 1 });
reportSchema.index({ Tenant: 1, status: 1, updatedAt: -1 });

export const Report = mongoose.model<ReportDocument>('Report', reportSchema);
