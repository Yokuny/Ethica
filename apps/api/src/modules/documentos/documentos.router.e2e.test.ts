import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import type { TenantDocument } from '@ethica/db';
import {
  connect,
  dateInDisplayTz,
  disconnect,
  hashToken,
  Lancamento,
  Parte,
  Pericia,
  Prazo,
  Session,
  Tenant,
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
    registroProfissional: 'CREA-SP 555',
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

const PERICIA = {
  numeroProcesso: '0001234-56.2026.5.02.0001',
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT2',
  objeto: 'Insalubridade',
};

describe('documentos e movimentações (DOC-02..04)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    rendered = undefined;
    await Promise.all([
      Lancamento.deleteMany({}),
      Prazo.deleteMany({}),
      Parte.deleteMany({}),
      Pericia.deleteMany({}),
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
    const operador = await seedSession(tenant._id, ['operator']);
    const admin = await seedSession(tenant._id, ['admin']);
    const created = await admin.as(request(app).post('/pericias')).send({ ...PERICIA, prazoLaudo: day(10) });
    const id = created.body.data.id;

    const deOperador = await operador
      .as(request(app).get(`/documentos/pericias/${id}/ficha`))
      .buffer()
      .parse(binary);
    expect(deOperador.status).toBe(200);
    expect(deOperador.headers['content-type']).toBe('application/pdf');
    expect(deOperador.headers['content-disposition']).toContain(`ficha-${PERICIA.numeroProcesso}.pdf`);
    expect((deOperador.body as Buffer).toString()).toContain('%PDF');
    expect(rendered?.html).toContain('Entrega do laudo');
    expect(rendered?.html).not.toContain('Resumo financeiro');
    expect(rendered?.html).toContain('CREA-SP 555');

    await admin
      .as(request(app).get(`/documentos/pericias/${id}/ficha`))
      .buffer()
      .parse(binary);
    expect(rendered?.html).toContain('Resumo financeiro');

    const checklist = await operador
      .as(request(app).get(`/documentos/pericias/${id}/checklist`))
      .buffer()
      .parse(binary);
    expect(checklist.status).toBe(200);
    expect(rendered?.html).toContain('Mapeamento de agentes');

    const outro = await seedSession((await seedTenant())._id, ['admin']);
    expect((await outro.as(request(app).get(`/documentos/pericias/${id}/ficha`))).status).toBe(404);
  });

  it('relatório financeiro: operador 403; admin recebe o período com recebido, pago e previsto', async () => {
    const tenant = await seedTenant();
    const operador = await seedSession(tenant._id, ['operator']);
    const manager = await seedSession(tenant._id, ['manager']);
    const honorario = await manager.as(request(app).post('/financeiro/lancamentos')).send({
      natureza: 'income',
      categoria: 'fixed_fees',
      descricao: 'Honorários do processo',
      valorCents: 300000,
      vencimento: day(5),
    });
    await manager
      .as(request(app).post(`/financeiro/lancamentos/${honorario.body.data.id}/parcelas`))
      .send({ valorCents: 100000, data: day(0), conta: 'Banco X' });
    const despesa = await manager.as(request(app).post('/financeiro/lancamentos')).send({
      natureza: 'expense',
      categoria: 'travel',
      descricao: 'Combustível',
      valorCents: 15000,
      vencimento: day(0),
    });
    await manager.as(request(app).patch(`/financeiro/lancamentos/${despesa.body.data.id}`)).send({ status: 'settled' });

    const query = `/documentos/financeiro?from=${day(-1)}&to=${day(10)}`;
    expect((await operador.as(request(app).get(query))).status).toBe(403);
    expect((await manager.as(request(app).get(`/documentos/financeiro?from=${day(1)}&to=${day(0)}`))).status).toBe(400);

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
    const parada = await as(request(app).post('/pericias')).send({ ...PERICIA, dataNomeacao: day(-90) });
    const ativa = await as(request(app).post('/pericias')).send({
      ...PERICIA,
      numeroProcesso: '0001234-56.2026.5.02.0002',
      dataNomeacao: day(-90),
    });
    await as(request(app).post('/pericias')).send({
      ...PERICIA,
      numeroProcesso: '0001234-56.2026.5.02.0003',
      dataNomeacao: day(-200),
    });
    await Pericia.updateOne({ numeroProcesso: '0001234-56.2026.5.02.0003' }, { status: 'completed' });

    const mov = await as(request(app).post(`/pericias/${ativa.body.data.id}/movimentacoes`)).send({
      tipo: 'clarification_summons',
      data: day(-5),
      observacoes: 'Quesitos da reclamada',
    });
    expect(mov.status).toBe(201);
    expect(mov.body.data.movimentacoes).toEqual([
      expect.objectContaining({ tipo: 'clarification_summons', data: day(-5) }),
    ]);
    expect(
      (await as(request(app).post(`/pericias/${ativa.body.data.id}/movimentacoes`)).send({ tipo: 'x', data: day(0) }))
        .status,
    ).toBe(400);

    await as(request(app).get('/documentos/paradas')).buffer().parse(binary);
    expect(rendered?.html).toContain(parada.body.data.numeroProcesso);
    expect(rendered?.html).toContain('>90<');
    expect(rendered?.html).not.toContain('0001234-56.2026.5.02.0002');
    expect(rendered?.html).not.toContain('0001234-56.2026.5.02.0003');

    const movId = mov.body.data.movimentacoes[0].id;
    const removed = await as(request(app).delete(`/pericias/${ativa.body.data.id}/movimentacoes/${movId}`));
    expect(removed.status).toBe(200);
    expect(removed.body.data.movimentacoes).toEqual([]);
    expect((await as(request(app).delete(`/pericias/${ativa.body.data.id}/movimentacoes/${movId}`))).status).toBe(404);
  });

  it('cronograma lista os prazos pendentes com "faltam N dias"', async () => {
    const tenant = await seedTenant();
    const { as } = await seedSession(tenant._id, ['operator']);
    await as(request(app).post('/pericias')).send({ ...PERICIA, prazoLaudo: day(3) });
    const res = await as(request(app).get('/documentos/prazos')).buffer().parse(binary);
    expect(res.status).toBe(200);
    expect(rendered?.html).toContain('Faltam 3 dias · vence em breve');
    expect(rendered?.html).toContain(PERICIA.numeroProcesso);
  });

  it('exportação: só admin; ZIP com um CSV por entidade, usuários sem senha, e registra quem e quando', async () => {
    const tenant = await seedTenant();
    const operador = await seedSession(tenant._id, ['operator']);
    const admin = await seedSession(tenant._id, ['admin']);
    await admin.as(request(app).post('/pericias')).send({ ...PERICIA, objeto: 'Ruído; calor "extremo"' });

    expect((await operador.as(request(app).get('/documentos/export'))).status).toBe(403);
    const res = await admin.as(request(app).get('/documentos/export')).buffer().parse(binary);
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
    const pericias = strFromU8(files['pericias.csv'] as Uint8Array);
    expect(pericias.startsWith('id;numeroProcesso;')).toBe(true);
    expect(pericias).toContain('"Ruído; calor ""extremo"""');
    const usuarios = strFromU8(files['usuarios.csv'] as Uint8Array);
    expect(usuarios).toContain(admin.user.email);
    expect(usuarios).not.toContain('hash-secreto');

    const saved = await Tenant.findById(tenant._id).lean();
    expect(saved?.dataExports).toEqual([expect.objectContaining({ User: admin.user._id })]);
  });
});
