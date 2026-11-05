import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../tests/helpers/db.helper.js';
import { Case, migrateCases } from './case.model.js';

describe('migrateCases (AD-178)', () => {
  useTestDb();

  it('turns the routine status into phase + status and is idempotent', async () => {
    const tenant = new mongoose.Types.ObjectId();
    const old = (status: string, extra: object = {}) => ({ Tenant: tenant, status, subject: status, ...extra });
    await Case.collection.insertMany([
      old('fees_accepted'),
      old('inspection_scheduled'),
      old('clarifications'),
      old('completed'),
      old('suspended'),
      old('declined', { serviceStatus: 'canceled' }),
      old('custom', { statusName: 'Aguardando documentos', serviceType: 'Avaliação' }),
      old('active', { phase: 'awaiting_judge' }),
      old('active', { phase: 'awaiting_expert_report' }),
    ]);

    await migrateCases();
    await migrateCases();

    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => [doc.phase, doc.status])).toEqual([
      ['awaiting_scheduling', 'active'],
      ['inspection_scheduled', 'active'],
      ['objection_reply', 'active'],
      ['fees_received', 'active'],
      ['awaiting_scheduling', 'suspended'],
      ['awaiting_scheduling', 'canceled'],
      ['custom', 'active'],
      ['awaiting_judge', 'active'],
      // "Aguardando laudo pericial" → "Laudo em elaboração" (AD-180).
      ['drafting_report', 'active'],
    ]);
    expect(docs[6]?.phaseName).toBe('Aguardando documentos');
    expect(docs.some((doc) => 'statusName' in doc || 'serviceStatus' in doc)).toBe(false);
  });

  it('drops the "Extrajudicial" sphere and turns "Parceria" into an own type', async () => {
    const tenant = new mongoose.Types.ObjectId();
    await Case.collection.insertMany([
      {
        Tenant: tenant,
        status: 'active',
        phase: 'awaiting_scheduling',
        subject: 'a',
        courtType: 'extrajudicial',
        role: 'partnership',
      },
      {
        Tenant: tenant,
        status: 'active',
        phase: 'awaiting_scheduling',
        subject: 'b',
        courtType: 'labor',
        role: 'court_expert',
      },
    ]);
    await migrateCases();
    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => doc.courtType)).toEqual([undefined, 'labor']);
    expect(docs[0]).toMatchObject({ role: 'other', roleName: 'Parceria', serviceType: 'Parceria' });
  });

  it('service order becomes upper case unless it would repeat another (AD-187)', async () => {
    await Case.syncIndexes();
    const tenant = new mongoose.Types.ObjectId();
    const base = { Tenant: tenant, status: 'active', phase: 'awaiting_scheduling', role: 'court_expert' };
    await Case.collection.insertMany([
      { ...base, subject: 'a', serviceOrder: 'ts-1' },
      { ...base, subject: 'b', serviceOrder: 'TS-2' },
      { ...base, subject: 'c', serviceOrder: 'ts-2' },
    ]);
    await migrateCases();
    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => doc.serviceOrder)).toEqual(['TS-1', 'TS-2', 'ts-2']);
  });

  it('technical assistance with a perícia phase goes to "Contratado" (AD-186)', async () => {
    const tenant = new mongoose.Types.ObjectId();
    const assistance = (phase: string, extra: object = {}) => ({
      Tenant: tenant,
      status: 'active',
      subject: phase,
      role: 'technical_assistant',
      phase,
      ...extra,
    });
    await Case.collection.insertMany([
      assistance('drafting_report'),
      assistance('fees_received'),
      assistance('technical_opinion_drafting'),
      assistance('awaiting_inspection', { serviceType: 'Avaliação' }),
    ]);
    await migrateCases();
    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => doc.phase)).toEqual([
      'assistance_hired',
      'fees_received',
      'technical_opinion_drafting',
      'inspection_scheduled',
    ]);
  });

  it('merged perícia phases go to the phase that took their place (AD-196)', async () => {
    const tenant = new mongoose.Types.ObjectId();
    const merged = [
      ['objection_reply_3', 'objection_reply'],
      ['objection_return_2', 'objection_return'],
      ['awaiting_pje_signature', 'reviewing_report'],
      ['awaiting_new_clarifications', 'clarifications'],
      ['awaiting_inspection', 'inspection_scheduled'],
    ];
    await Case.collection.insertMany(
      merged.map(([phase]) => ({ Tenant: tenant, role: 'court_expert', status: 'active', subject: 'x', phase })),
    );
    await migrateCases();
    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => doc.phase)).toEqual(merged.map(([, phase]) => phase));
  });
});
