import type { ReportDocument, ReportSectionDocument } from '@ethica/db';
import { Report, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import { issuesOf } from './report.html.js';
import type {
  ListReportsQuery,
  ReportCreateInput,
  ReportListItem,
  ReportMediaWrite,
  ReportRecord,
  ReportSectionRecord,
  ReportSectionsReplace,
  UpdateReportSection,
} from './report.schema.js';

const sectionToRecord = (section: ReportSectionDocument): ReportSectionRecord => ({
  id: section._id.toString(),
  ...(section.templateSectionId ? { templateSectionId: section.templateSectionId } : {}),
  title: section.title,
  level: section.level,
  titleOnly: section.titleOnly,
  pageBreak: section.pageBreak,
  variant: section.variant,
  html: section.html,
});

const toRecord = (doc: ReportDocument): ReportRecord => {
  const sections = doc.sections.map(sectionToRecord);
  return {
    id: doc._id.toString(),
    caseId: doc.Case.toString(),
    type: doc.type,
    status: doc.status,
    title: doc.title,
    ...(doc.templateId ? { templateId: doc.templateId } : {}),
    templateName: doc.templateName,
    sections,
    issues: issuesOf(sections),
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const create = async (input: ReportCreateInput): Promise<ReportRecord> =>
  withDbTiming('report.create', async () => {
    const { tenantId, caseId, userId, ...rest } = input;
    return toRecord(await Report.create({ ...rest, Tenant: tenantId, Case: caseId, CreatedBy: userId }));
  });

export const findById = async (tenantId: string, id: string): Promise<ReportRecord | null> =>
  withDbTiming('report.findById', async () => {
    const doc = await Report.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const list = async (
  tenantId: string,
  query: ListReportsQuery,
): Promise<{ items: ReportListItem[]; total: number }> =>
  withDbTiming('report.list', async () => {
    const match = {
      Tenant: toObjectId(tenantId),
      ...(query.status ? { status: query.status } : {}),
      ...(query.caseId ? { Case: toObjectId(query.caseId) } : {}),
    };
    const [result] = await Report.aggregate<{
      items: Array<ReportDocument & { totalSections: number }>;
      total: { n: number }[];
    }>([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { updatedAt: -1, _id: 1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            { $addFields: { totalSections: { $size: '$sections' } } },
            { $project: { sections: 0 } },
          ],
          total: [{ $count: 'n' }],
        },
      },
    ]);
    return {
      items: (result?.items ?? []).map((doc) => ({
        id: String(doc._id),
        caseId: String(doc.Case),
        type: doc.type,
        status: doc.status,
        title: doc.title,
        templateName: doc.templateName,
        totalSections: doc.totalSections,
        completedAt: doc.completedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total: result?.total[0]?.n ?? 0,
    };
  });

// Writes only apply to drafts: the `status: 'draft'` filter is the server-side lock (AD-126).
const draft = (tenantId: string, id: string, extra: Record<string, unknown> = {}) =>
  tenantScoped({ Tenant: tenantId, _id: id, status: 'draft' as const, ...extra });

export const updateSection = async (
  tenantId: string,
  id: string,
  sectionId: string,
  data: UpdateReportSection,
): Promise<ReportRecord | null> =>
  withDbTiming('report.updateSection', async () => {
    const $set = Object.fromEntries(
      Object.entries(data)
        .filter(([, amount]) => amount !== undefined)
        .map(([field, amount]) => [`sections.$.${field}`, amount]),
    );
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id, { 'sections._id': toObjectId(sectionId) }),
      { $set },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const replaceSections = async (
  tenantId: string,
  id: string,
  { templateId, templateName, sections }: ReportSectionsReplace,
): Promise<ReportRecord | null> =>
  withDbTiming('report.replaceSections', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      {
        $set: {
          templateId,
          templateName,
          sections: sections.map(({ id: sectionId, ...section }) =>
            sectionId ? { ...section, _id: toObjectId(sectionId) } : section,
          ),
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const removeSection = async (tenantId: string, id: string, sectionId: string): Promise<ReportRecord | null> =>
  withDbTiming('report.removeSection', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id, { 'sections._id': toObjectId(sectionId), 'sections.1': { $exists: true } }),
      { $pull: { sections: { _id: toObjectId(sectionId) } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Saves the final text, with the variables resolved again, together with the status.
export const complete = async (
  tenantId: string,
  id: string,
  userId: string,
  now: Date,
  sections: ReportSectionRecord[],
): Promise<ReportRecord | null> =>
  withDbTiming('report.complete', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      {
        $set: {
          status: 'completed',
          completedAt: now,
          CompletedBy: userId,
          sections: sections.map(({ id: sectionId, ...section }) => ({ ...section, _id: toObjectId(sectionId) })),
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Only in the draft and only once per id: a resend of the same photo does not add it twice.
export const addMedia = async (tenantId: string, id: string, media: ReportMediaWrite): Promise<boolean> =>
  withDbTiming('report.addMedia', async () => {
    const result = await Report.updateOne(draft(tenantId, id, { 'media.id': { $ne: media.id } }), {
      $push: { media },
    });
    return result.modifiedCount === 1;
  });

export const findMedia = async (tenantId: string, id: string, mediaId: string): Promise<ReportMediaWrite | null> =>
  withDbTiming('report.findMedia', async () => {
    const doc = await Report.findOne(tenantScoped({ Tenant: tenantId, _id: id, 'media.id': mediaId }), {
      media: { $elemMatch: { id: mediaId } },
    }).lean();
    return doc?.media[0] ?? null;
  });

export const listMedia = async (tenantId: string, id: string): Promise<ReportMediaWrite[]> =>
  withDbTiming('report.listMedia', async () => {
    const doc = await Report.findOne(tenantScoped({ Tenant: tenantId, _id: id }), { media: 1 }).lean();
    return doc?.media ?? [];
  });

export const removeDraft = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('report.removeDraft', async () => {
    const result = await Report.deleteOne(draft(tenantId, id));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const deleteByCase = async (tenantId: string, caseId: string): Promise<void> =>
  withDbTiming('report.deleteByCase', async () => {
    await Report.deleteMany(tenantScoped({ Tenant: tenantId, Case: caseId }));
  });
