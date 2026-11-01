import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import {
  Activity,
  Case,
  connect,
  Deadline,
  dateInDisplayTz,
  disconnect,
  hashToken,
  Party,
  Session,
  Tenant,
  Transaction,
  User,
} from '@ethica/db';
import { strFromU8, unzipSync } from 'fflate';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';
import type { PdfDocument } from '../../providers/pdfRenderer.js';

const DEVICE = 'test-agent';
let rendered: PdfDocument | undefined;
const app = buildApp({
  pdf: {
    render: async (document) => {
      rendered = document;
      return Buffer.from('%PDF-1.7 fake');
    },
  },
  storage: null,
});

const day = (offset: number): string => {
  const date = new Date(`${dateInDisplayTz(new Date())}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

// Corpo binário (PDF/ZIP) como Buffer no supertest.
const binary = (res: request.Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

let counter = 0;
const seedTenant = async () => {
  counter += 1;
  return Tenant.create({
    name: `Escritório ${counter}`,
    document: `8888888800${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
};

const seedSession = async (tenantId: TenantDocument['_id'], role: Role[]) => {
  counter += 1;
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `doc-${counter}@x.com`,
    password: 'hash-secreto',
    Tenant: tenantId,
    role,
    professionalRegistration: 'CREA-SP 555',
  });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { user, as };
};

const CASE = {
  processNumber: '0001234-56.2026.5.02.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT2',
  subject: 'Insalubridade',
};

describe('documentos e movimentações (DOC-02..04)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    rendered = undefined;
    await Promise.all([
      Transaction.deleteMany({}),
      Activity.deleteMany({}),
      Deadline.deleteMany({}),
      Party.deleteMany({}),
      Case.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('ficha: PDF para qualquer papel, resumo financeiro só para admin/manager; outro tenant é 404', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const admin = await seedSession(tenant._id, ['admin']);
    const created = await admin.as(request(app).post('/expert-cases')).send({ ...CASE, reportDeadline: day(10) });
    const id = created.body.data.id;

    const ofOperator = await operator
      .as(request(app).get(`/documents/expert-cases/${id}/sheet`))
      .buffer()
      .parse(binary);
    expect(ofOperator.status).toBe(200);
    expect(ofOperator.headers['content-type']).toBe('application/pdf');
    expect(ofOperator.headers['content-disposition']).toContain(`ficha-${CASE.processNumber}.pdf`);
    expect((ofOperator.body as Buffer).toString()).toContain('%PDF');
    expect(rendered?.html).toContain('Entrega do laudo');
    expect(rendered?.html).not.toContain('Resumo financeiro');
    expect(rendered?.html).toContain('CREA-SP 555');

    await admin
      .as(request(app).get(`/documents/expert-cases/${id}/sheet`))
      .buffer()
      .parse(binary);
    expect(rendered?.html).toContain('Resumo financeiro');

    const checklist = await operator
      .as(request(app).get(`/documents/expert-cases/${id}/checklist`))
      .buffer()
      .parse(binary);
    expect(checklist.status).toBe(200);
    expect(rendered?.html).toContain('Mapeamento de agentes');

    const other = await seedSession((await seedTenant())._id, ['admin']);
    expect((await other.as(request(app).get(`/documents/expert-cases/${id}/sheet`))).status).toBe(404);
  });

  it('relatório financeiro: operador 403; admin recebe o período com recebido, pago e previsto', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const manager = await seedSession(tenant._id, ['manager']);
    const fee = await manager.as(request(app).post('/finance/entries')).send({
      kind: 'income',
      category: 'fixed_fees',
      description: 'Honorários do processo',
      amountCents: 300000,
      dueDate: day(5),
    });
    await manager
      .as(request(app).post(`/finance/entries/${fee.body.data.id}/installments`))
      .send({ amountCents: 100000, date: day(0), account: 'Banco X' });
    const expense = await manager.as(request(app).post('/finance/entries')).send({
      kind: 'expense',
      category: 'travel',
      description: 'Combustível',
      amountCents: 15000,
      dueDate: day(0),
    });
    await manager.as(request(app).patch(`/finance/entries/${expense.body.data.id}`)).send({ status: 'settled' });

    const query = `/documents/finance?from=${day(-1)}&to=${day(10)}`;
    expect((await operator.as(request(app).get(query))).status).toBe(403);
    expect((await manager.as(request(app).get(`/documents/finance?from=${day(1)}&to=${day(0)}`))).status).toBe(400);

    const res = await manager.as(request(app).get(query)).buffer().parse(binary);
    expect(res.status).toBe(200);
    expect(rendered?.html).toContain('Honorários do processo (Banco X)');
    expect(rendered?.html).toContain('Combustível');
    expect(rendered?.html).toMatch(/Saldo realizado<\/dt><dd>R\$\s850,00/);
    expect(rendered?.html).toMatch(/Saldo previsto<\/dt><dd>R\$\s2\.850,00/);
  });

  it('movimentações entram e saem da perícia; parada = aberta sem movimentação há mais de 60 dias', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['operator']);
    const stalled = await as(request(app).post('/expert-cases')).send({ ...CASE, nominationDate: day(-90) });
    const active = await as(request(app).post('/expert-cases')).send({
      ...CASE,
      processNumber: '0001234-56.2026.5.02.0002',
      nominationDate: day(-90),
    });
    await as(request(app).post('/expert-cases')).send({
      ...CASE,
      processNumber: '0001234-56.2026.5.02.0003',
      nominationDate: day(-200),
    });
    await Case.updateOne({ processNumber: '0001234-56.2026.5.02.0003' }, { status: 'completed' });

    const mov = await as(request(app).post(`/expert-cases/${active.body.data.id}/movements`)).send({
      type: 'clarification_summons',
      date: day(-5),
      notes: 'Quesitos da reclamada',
    });
    expect(mov.status).toBe(201);
    expect(mov.body.data.movements).toEqual([
      expect.objectContaining({ type: 'clarification_summons', date: day(-5) }),
    ]);
    expect(
      (await as(request(app).post(`/expert-cases/${active.body.data.id}/movements`)).send({ type: 'x', date: day(0) }))
        .status,
    ).toBe(400);

    await as(request(app).get('/documents/stalled')).buffer().parse(binary);
    expect(rendered?.html).toContain(stalled.body.data.processNumber);
    expect(rendered?.html).toContain('>90<');
    expect(rendered?.html).not.toContain('0001234-56.2026.5.02.0002');
    expect(rendered?.html).not.toContain('0001234-56.2026.5.02.0003');

    const movId = mov.body.data.movements[0].id;
    const removed = await as(request(app).delete(`/expert-cases/${active.body.data.id}/movements/${movId}`));
    expect(removed.status).toBe(200);
    expect(removed.body.data.movements).toEqual([]);
    expect((await as(request(app).delete(`/expert-cases/${active.body.data.id}/movements/${movId}`))).status).toBe(404);
  });

  it('cronograma lista os prazos pendentes com "faltam N dias"', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['operator']);
    await as(request(app).post('/expert-cases')).send({ ...CASE, reportDeadline: day(3) });
    const res = await as(request(app).get('/documents/deadlines')).buffer().parse(binary);
    expect(res.status).toBe(200);
    expect(rendered?.html).toContain('Faltam 3 dias · vence em breve');
    expect(rendered?.html).toContain(CASE.processNumber);
  });

  it('exportação: só admin; ZIP com um CSV por entidade, usuários sem senha, e registra quem e quando', async () => {
    const tenant = await seedTenant();
    const operator = await seedSession(tenant._id, ['operator']);
    const admin = await seedSession(tenant._id, ['admin']);
    await admin.as(request(app).post('/expert-cases')).send({ ...CASE, subject: 'Ruído; calor "extremo"' });

    expect((await operator.as(request(app).get('/documents/export'))).status).toBe(403);
    const res = await admin.as(request(app).get('/documents/export')).buffer().parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');

    const files = unzipSync(new Uint8Array(res.body as Buffer));
    expect(Object.keys(files).sort()).toEqual([
      'compromissos.csv',
      'lancamentos.csv',
      'oportunidades.csv',
      'partes.csv',
      'pericias.csv',
      'prazos.csv',
      'usuarios.csv',
    ]);
    // UTF-8 com BOM (o TextDecoder do strFromU8 já remove o BOM do texto).
    expect([...(files['pericias.csv'] as Uint8Array).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const cases = strFromU8(files['pericias.csv'] as Uint8Array);
    expect(cases.startsWith('id;numeroProcesso;')).toBe(true);
    expect(cases).toContain('"Ruído; calor ""extremo"""');
    const users = strFromU8(files['usuarios.csv'] as Uint8Array);
    expect(users).toContain(admin.user.email);
    expect(users).not.toContain('hash-secreto');

    // Quem exportou vai ao diário de bordo (AD-134), gravado ao fim da resposta.
    await expect
      .poll(async () => Activity.findOne({ Tenant: tenant._id, action: 'export' }).lean())
      .toMatchObject({ User: admin.user._id, module: 'office' });
  });
});
