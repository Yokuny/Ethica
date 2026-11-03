import type { SignatoryDocument } from '@ethica/db';
import { Signatory, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { SignatoryInput, SignatoryLogo, SignatoryRecord } from './signatory.schema.js';

const toRecord = (doc: SignatoryDocument): SignatoryRecord => ({
  id: doc._id.toString(),
  name: doc.name,
  cpf: doc.cpf ?? '',
  professionalRegistration: doc.professionalRegistration ?? '',
  education: doc.education ?? '',
  phone: doc.phone ?? '',
  header: doc.header ?? '',
  footer: doc.footer ?? '',
  ...(doc.logo ? { logo: `/expert-reports/signatories/${doc._id}/logo?v=${doc.logo.updatedAt?.getTime() ?? 0}` } : {}),
});

// Empty text is a missing field: header, footer and logo fall back to the office ones (AD-121).
const write = (data: SignatoryInput) => {
  const entries = Object.entries(data);
  return {
    $set: Object.fromEntries(entries.filter(([, value]) => value)),
    $unset: Object.fromEntries(entries.filter(([, value]) => !value).map(([key]) => [key, 1])),
  };
};

export const list = async (tenantId: string): Promise<SignatoryRecord[]> =>
  withDbTiming('signatory.list', async () =>
    (
      await Signatory.find(tenantScoped({ Tenant: tenantId }))
        .sort({ name: 1 })
        .lean()
    ).map(toRecord),
  );

export const findById = async (tenantId: string, id: string): Promise<SignatoryDocument | null> =>
  withDbTiming('signatory.findById', async () => Signatory.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean());

export const create = async (tenantId: string, data: SignatoryInput): Promise<SignatoryRecord> =>
  withDbTiming('signatory.create', async () => {
    const { $set } = write(data);
    return toRecord((await Signatory.create({ ...$set, Tenant: tenantId })).toObject());
  });

export const update = async (tenantId: string, id: string, data: SignatoryInput): Promise<SignatoryRecord | null> =>
  withDbTiming('signatory.update', async () => {
    const doc = await Signatory.findOneAndUpdate(tenantScoped({ Tenant: tenantId, _id: id }), write(data), {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    return doc ? toRecord(doc) : null;
  });

export const setLogo = async (tenantId: string, id: string, logo: SignatoryLogo | null): Promise<void> =>
  withDbTiming('signatory.setLogo', async () => {
    await Signatory.updateOne(
      tenantScoped({ Tenant: tenantId, _id: id }),
      logo ? { $set: { logo: { ...logo, updatedAt: new Date() } } } : { $unset: { logo: 1 } },
    );
  });

export const remove = async (tenantId: string, id: string): Promise<SignatoryDocument | null> =>
  withDbTiming('signatory.remove', async () =>
    Signatory.findOneAndDelete(tenantScoped({ Tenant: tenantId, _id: id })).lean(),
  );
