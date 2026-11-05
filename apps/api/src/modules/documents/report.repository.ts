import { REPORT_LAYOUT_DEFAULT, type ReportLayout } from '@ethica/contracts';
import type { ReportDocument, ReportSectionDocument } from '@ethica/db';
import { Report, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import { issuesOf } from './report.html.js';
import type {
  ListReportsQuery,
  ReportCreateInput,
  ReportFileWrite,
  ReportListItem,
  ReportMediaWrite,
  ReportRecord,
  ReportSectionRecord,
  ReportSectionsReplace,
  ReportSectionWrite,
  UpdateReportSection,
} from './report.schema.js';

const sectionToRecord = (section: ReportSectionDocument): ReportSectionRecord => ({
  id: section._id.toString(),
  ...(section.templateSectionId ? { templateSectionId: section.templateSectionId } : {}),
  title: section.title,
  level: section.level,
  titleOnly: section.titleOnly,
  pageBreak: section.pageBreak,
  unnumbered: section.unnumbered ?? false,
  included: section.included ?? true,
  variant: section.variant,
  html: section.html,
});

const toRecord = (doc: ReportDocument): ReportRecord => {
  const sections = doc.sections.map(sectionToRecord);
  return {
    id: doc._id.toString(),
    caseId: doc.Case.toString(),
    ...(doc.Signatory ? { signatoryId: doc.Signatory.toString() } : {}),
    type: doc.type,
    status: doc.status,
    title: doc.title,
    ...(doc.templateId ? { templateId: doc.templateId } : {}),
    templateName: doc.templateName,
    sections,
    layout: { ...REPORT_LAYOUT_DEFAULT, ...doc.layout },
    issues: issuesOf(sections),
    ...(doc.file ? { file: { name: doc.file.name, bytes: doc.file.bytes } } : {}),
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(doc.UpdatedBy ? { updatedById: doc.UpdatedBy.toString() } : {}),
  };
};

export const create = async (input: ReportCreateInput): Promise<ReportRecord> =>
  withDbTiming('report.create', async () => {
    const { tenantId, caseId, userId, signatoryId, ...rest } = input;
    return toRecord(
      await Report.create({
        ...rest,
        // Attached PDF (ANL-02): born completed.
        ...(rest.completedAt ? { status: 'completed', CompletedBy: userId } : {}),
        Tenant: tenantId,
        Case: caseId,
        Signatory: signatoryId,
        CreatedBy: userId,
        UpdatedBy: userId,
      }),
    );
  });

export const findById = async (tenantId: string, id: string): Promise<ReportRecord | null> =>
  withDbTiming('report.findById', async () => {
    const doc = await Report.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

const SORT_KEY: Record<ListReportsQuery['sort'], unknown> = {
  templateName: { $toLower: '$templateName' },
  status: '$status',
  updatedAt: '$updatedAt',
};

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
            // Column click (AD-192): the template by name ignoring upper case; ties, the last change first.
            { $addFields: { sortKey: SORT_KEY[query.sort] } },
            { $sort: { sortKey: query.order === 'asc' ? 1 : -1, updatedAt: -1, _id: 1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            { $addFields: { totalSections: { $size: '$sections' } } },
            { $project: { sections: 0, sortKey: 0 } },
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
        ...(doc.file ? { file: { name: doc.file.name, bytes: doc.file.bytes } } : {}),
        completedAt: doc.completedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        ...(doc.UpdatedBy ? { updatedById: String(doc.UpdatedBy) } : {}),
      })),
      total: result?.total[0]?.n ?? 0,
    };
  });

// Who writes: every write records the last author, shown in "Atualizado em" of the list.
type Author = { tenantId: string; userId: string };

// Writes only apply to drafts: the `status: 'draft'` filter is the server-side lock (AD-126).
const draft = (tenantId: string, id: string, extra: Record<string, unknown> = {}) =>
  tenantScoped({ Tenant: tenantId, _id: id, status: 'draft' as const, ...extra });

export const updateSection = async (
  { tenantId, userId }: Author,
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
      { $set: { ...$set, UpdatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// "Faz parte do laudo" of a topic goes to its subsections too (sectionFamily).
export const setIncluded = async (
  { tenantId, userId }: Author,
  id: string,
  sectionIds: string[],
  included: boolean,
): Promise<ReportRecord | null> =>
  withDbTiming('report.setIncluded', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      { $set: { 'sections.$[item].included': included, UpdatedBy: userId } },
      { arrayFilters: [{ 'item._id': { $in: sectionIds.map(toObjectId) } }], returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const replaceSections = async (
  { tenantId, userId }: Author,
  id: string,
  { templateId, templateName, sections }: ReportSectionsReplace,
): Promise<ReportRecord | null> =>
  withDbTiming('report.replaceSections', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      {
        $set: {
          UpdatedBy: userId,
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

// New order of the items (arrows on the screen), keeping each item id.
export const setSections = async (
  { tenantId, userId }: Author,
  id: string,
  sections: ReportSectionRecord[],
): Promise<ReportRecord | null> =>
  withDbTiming('report.setSections', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      {
        $set: {
          UpdatedBy: userId,
          sections: sections.map(({ id: sectionId, ...section }) => ({ ...section, _id: toObjectId(sectionId) })),
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// New item of the report itself (NLA-05) at `position` of the list.
export const insertSection = async (
  { tenantId, userId }: Author,
  id: string,
  position: number,
  section: ReportSectionWrite,
): Promise<ReportRecord | null> =>
  withDbTiming('report.insertSection', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      { $push: { sections: { $each: [section], $position: position } }, $set: { UpdatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const setLayout = async (
  { tenantId, userId }: Author,
  id: string,
  layout: ReportLayout,
): Promise<ReportRecord | null> =>
  withDbTiming('report.setLayout', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id),
      { $set: { layout, UpdatedBy: userId } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const removeSection = async (
  { tenantId, userId }: Author,
  id: string,
  sectionId: string,
): Promise<ReportRecord | null> =>
  withDbTiming('report.removeSection', async () => {
    const doc = await Report.findOneAndUpdate(
      draft(tenantId, id, { 'sections._id': toObjectId(sectionId), 'sections.1': { $exists: true } }),
      { $pull: { sections: { _id: toObjectId(sectionId) } }, $set: { UpdatedBy: userId } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Saves the final text, with the variables resolved again, together with the status.
export const complete = async (
  { tenantId, userId }: Author,
  id: string,
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
          UpdatedBy: userId,
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

// Storage key of the attached PDF (ANL-02); it never leaves the server.
export const fileOf = async (tenantId: string, id: string): Promise<ReportFileWrite | null> =>
  withDbTiming('report.fileOf', async () => {
    const doc = await Report.findOne(tenantScoped({ Tenant: tenantId, _id: id }), { file: 1 }).lean();
    return doc?.file ? { key: doc.file.key, name: doc.file.name, bytes: doc.file.bytes } : null;
  });

// A draft or an attached PDF is removed; a report completed in the Ethica stays (AD-126).
export const remove = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('report.remove', async () => {
    const result = await Report.deleteOne(
      tenantScoped({ Tenant: tenantId, _id: id, $or: [{ status: 'draft' as const }, { file: { $exists: true } }] }),
    );
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const deleteByCase = async (tenantId: string, caseId: string): Promise<void> =>
  withDbTiming('report.deleteByCase', async () => {
    await Report.deleteMany(tenantScoped({ Tenant: tenantId, Case: caseId }));
  });
