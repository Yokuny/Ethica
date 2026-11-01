import { REPORT_LEVEL_MAX, REPORT_TYPES, type ReportType } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Seção do modelo (LAU-01): a ordem é a do array e o número ("2.1") é calculado pelo nível,
// nunca gravado (AD-126). Os textos são HTML saneado na API (AD-123).
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
