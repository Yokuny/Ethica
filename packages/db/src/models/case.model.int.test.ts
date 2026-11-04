import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../tests/helpers/db.helper.js';
import { Case, migrateCases } from './case.model.js';

describe('migrateCases (RSV-03, AD-177)', () => {
  useTestDb();

  it('converts stage, phase and service status into the single status and is idempotent', async () => {
    const tenant = new mongoose.Types.ObjectId();
    const old = (status: string, extra: object = {}) => ({ Tenant: tenant, status, subject: status, ...extra });
    await Case.collection.insertMany([
      old('accepted', { phase: 'scheduling_inspection' }),
      old('inspection', { phase: 'settlement' }),
      old('appointed', { serviceStatus: 'proposal_sent' }),
      old('drafting_report', { serviceStatus: 'canceled' }),
      old('completed', { phase: 'fees_received' }),
      old('inspection'),
    ]);

    await migrateCases();
    await migrateCases();

    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => doc.status)).toEqual([
      'fees_accepted',
      'suspended',
      'fees_proposed',
      'declined',
      'completed',
      'inspection_scheduled',
    ]);
    expect(docs.some((doc) => 'phase' in doc || 'serviceStatus' in doc)).toBe(false);
  });

  it('turns the old office type marker into the sphere "Extrajudicial"', async () => {
    const tenant = new mongoose.Types.ObjectId();
    await Case.collection.insertMany([
      { Tenant: tenant, status: 'appointed', subject: 'a', courtType: 'other', serviceType: 'Avaliação' },
      { Tenant: tenant, status: 'appointed', subject: 'b', courtType: 'labor' },
    ]);
    await migrateCases();
    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => doc.courtType)).toEqual(['extrajudicial', 'labor']);
  });
});
