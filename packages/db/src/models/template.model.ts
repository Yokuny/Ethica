import { REPORT_LEVEL_MAX, REPORT_TYPES, type ReportType } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Template section (LAU-01): the order is the array order and the number ("2.1") is calculated from the level,
// never stored (AD-126). The texts are HTML sanitized in the API (AD-123).
export interface TemplateSectionDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  level: number;
  titleOnly: boolean;
  pageBreak: boolean;
  yesText: string;
  noText: string;
}

export interface TemplateDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  name: string;
  type: ReportType;
  sections: TemplateSectionDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<TemplateSectionDocument>({
  title: { type: String, required: true, trim: true },
  level: { type: Number, required: true, min: 1, max: REPORT_LEVEL_MAX },
  titleOnly: { type: Boolean, default: false },
  pageBreak: { type: Boolean, default: false },
  yesText: { type: String, default: '' },
  noText: { type: String, default: '' },
});

const templateSchema = new Schema<TemplateDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: REPORT_TYPES, required: true },
    sections: { type: [sectionSchema], default: [] },
  },
  { timestamps: true, collection: 'templates' },
);

templateSchema.index({ Tenant: 1, type: 1, name: 1 });

export const Template = mongoose.model<TemplateDocument>('Template', templateSchema);
