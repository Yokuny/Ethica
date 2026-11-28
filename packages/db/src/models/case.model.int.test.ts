import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestDb } from '../../tests/helpers/db.helper.js';
import { Case, migrateCases } from './case.model.js';

describe('migrateCases (AD-310)', () => {
  useTestDb();

  it('turns role, typed type, typed role and typed phase into the enums and is idempotent', async () => {
    const tenant = new mongoose.Types.ObjectId();
    const old = (extra: object) => ({ Tenant: tenant, status: 'active', subject: 's', ...extra });
    await Case.collection.insertMany([
      old({ role: 'court_expert', courtType: 'civil', phase: 'nominated' }),
      old({ role: 'technical_assistant', courtType: 'labor', phase: 'assistance_closed' }),
      old({ role: 'technical_assistant', phase: 'assistance_hired' }),
      old({
        role: 'other',
        roleName: 'Vistoria Urbana',
        serviceType: 'Parceria',
        phase: 'custom',
        phaseName: 'Finalizado',
      }),
      old({
        role: 'court_expert',
        serviceType: 'Serviço particular',
        phase: 'custom',
        phaseName: 'Entregue',
        notes: 'n',
      }),
      old({ role: 'other', serviceType: 'Consultoria', phase: 'custom', phaseName: 'Aguardando' }),
      old({ role: 'court_expert', serviceType: 'Parceria', phase: 'fees_received' }),
      old({ serviceType: 'expert_examination', courtType: 'labor', phase: 'awaiting_judge' }),
    ]);

    await migrateCases();
    await migrateCases();

    const docs = await Case.collection.find({}, { sort: { _id: 1 } }).toArray();
    expect(docs.map((doc) => [doc.serviceType, doc.phase, doc.courtType])).toEqual([
      ['expert_examination', 'nominated', 'civil'],
      ['technical_assistance', 'finished', undefined],
      ['technical_assistance', 'hired', undefined],
      ['partnership', 'finished', undefined],
      ['private_service', 'delivered', undefined],
      ['private_service', 'in_progress', undefined],
      ['partnership', 'fees_received', undefined],
      ['expert_examination', 'awaiting_judge', 'labor'],
    ]);
    expect(docs[3]?.notes).toBe('Atuação: Vistoria Urbana');
    expect(docs[4]?.notes).toBe('n');
    expect(docs.some((doc) => 'role' in doc || 'roleName' in doc || 'phaseName' in doc)).toBe(false);
  });
});
