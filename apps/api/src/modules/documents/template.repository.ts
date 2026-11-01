import type { ReportType } from '@ethica/contracts';
import type { TemplateDocument, TemplateSectionDocument } from '@ethica/db';
import { Template, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { TemplateRecord, TemplateSection, TemplateSectionRecord, TemplateSummary } from './report.schema.js';

const sectionToRecord = (section: TemplateSectionDocument): TemplateSectionRecord => ({
  id: section._id.toString(),
  title: section.title,
  level: section.level,
  titleOnly: section.titleOnly,
  pageBreak: section.pageBreak,
  yesText: section.yesText,
  noText: section.noText,
});

const toRecord = (doc: TemplateDocument): TemplateRecord => ({
  id: doc._id.toString(),
  name: doc.name,
  type: doc.type,
  isDefault: false,
  sections: doc.sections.map(sectionToRecord),
  updatedAt: doc.updatedAt,
});

export const list = async (tenantId: string, type?: ReportType): Promise<TemplateSummary[]> =>
  withDbTiming('template.list', async () => {
    const rows = await Template.aggregate<{
      _id: unknown;
      name: string;
      type: ReportType;
      totalSections: number;
      updatedAt: Date;
    }>([
      { $match: { Tenant: toObjectId(tenantId), ...(type ? { type } : {}) } },
      { $sort: { name: 1, _id: 1 } },
      { $project: { name: 1, type: 1, updatedAt: 1, totalSections: { $size: '$sections' } } },
    ]);
    return rows.map(({ _id, ...row }) => ({ ...row, id: String(_id), isDefault: false }));
  });

export const findById = async (tenantId: string, id: string): Promise<TemplateRecord | null> =>
  withDbTiming('template.findById', async () => {
    const doc = await Template.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const create = async (
  tenantId: string,
  data: { name: string; type: ReportType; sections: TemplateSection[] },
): Promise<TemplateRecord> =>
  withDbTiming('template.create', async () => toRecord(await Template.create({ ...data, Tenant: tenantId })));

export const updateName = async (tenantId: string, id: string, name: string): Promise<TemplateRecord | null> =>
  withDbTiming('template.updateName', async () => {
    const doc = await Template.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: { name } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const remove = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('template.remove', async () => {
    const result = await Template.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const addSection = async (
  tenantId: string,
  id: string,
  section: TemplateSection,
): Promise<TemplateRecord | null> =>
  withDbTiming('template.addSection', async () => {
    const doc = await Template.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $push: { sections: section } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const updateSection = async (
  tenantId: string,
  id: string,
  sectionId: string,
  section: TemplateSection,
): Promise<TemplateRecord | null> =>
  withDbTiming('template.updateSection', async () => {
    const $set = Object.fromEntries(Object.entries(section).map(([field, amount]) => [`sections.$.${field}`, amount]));
    const doc = await Template.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, 'sections._id': toObjectId(sectionId) }),
      { $set },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const removeSection = async (tenantId: string, id: string, sectionId: string): Promise<TemplateRecord | null> =>
  withDbTiming('template.removeSection', async () => {
    const doc = await Template.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, 'sections._id': toObjectId(sectionId) }),
      { $pull: { sections: { _id: toObjectId(sectionId) } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Reordering: saves the whole list in the new order, keeping the section ids.
export const setSections = async (
  tenantId: string,
  id: string,
  sections: TemplateSectionRecord[],
): Promise<TemplateRecord | null> =>
  withDbTiming('template.setSections', async () => {
    const doc = await Template.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      {
        $set: {
          sections: sections.map(({ id: sectionId, ...section }) => ({ ...section, _id: toObjectId(sectionId) })),
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });
