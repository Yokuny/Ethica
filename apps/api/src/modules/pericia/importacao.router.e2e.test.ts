import crypto from 'node:crypto';
import { connect, disconnect, hashToken, Parte, Pericia, Prazo, Session, Tenant, User } from '@ethica/db';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { env } from '../../config/env.config.js';

const DEVICE = 'test-agent';
const app = buildApp();

let counter = 0;
const seedSession = async () => {
  counter += 1;
  const tenant = await Tenant.create({
    name: `Escritório ${counter}`,
    document: `5555555500${String(counter).padStart(4, '0')}`,
    status: 'active',
  });
  const user = await User.create({
    name: `Perito ${counter}`,
    email: `import-${counter}@x.com`,
    password: 'hash',
    Tenant: tenant._id,
    role: ['operator'],
  });
  const raw = jwt.sign({ user: user.id, jti: crypto.randomUUID() }, env.SESSION_JWT_SECRET);
  await Session.create({
    user: user.id,
    tokenHash: hashToken(raw),
    deviceInfo: DEVICE,
    expiresAt: new Date(Date.now() + 3600_000),
  });
  const as = <T extends request.Test>(req: T): T => req.set('Cookie', `refreshToken=${raw}`).set('User-Agent', DEVICE);
  return { tenant, as };
};

// PDF mínimo com uma linha de texto por item (Helvetica, WinAnsi), sem biblioteca.
const pdfDe = (linhas: string[]): Buffer => {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = ['BT', '/F1 11 Tf', '14 TL', '50 780 Td', ...linhas.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

const ATA = [
  '1ª Vara do Trabalho de São Paulo',
  'ATOrd 0001234-56.2026.5.02.0001',
  'RECLAMANTE: MARIA DA SILVA',
  'RECLAMADO: INDÚSTRIA EXEMPLO LTDA',
  'Defiro a perícia de insalubridade. Nomeio o perito em 15/10/2026.',
  'O laudo deverá ser entregue até 30/11/2026.',
];

const CABECALHO = 'numero_processo;papel;objeto;data_nomeacao;prazo_laudo;reu;reu_documento';

describe('importação de perícias (IMP-01, IMP-02)', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });
  afterEach(async () => {
    await Promise.all([
      Parte.deleteMany({}),
      Prazo.deleteMany({}),
      Pericia.deleteMany({}),
      Session.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await disconnect();
  });

  it('PDF devolve o rascunho sem gravar; número já cadastrado traz existingId (IMP-01.1, IMP-01.3)', async () => {
    const { as } = await seedSession();
    const enviar = () =>
      as(request(app).post('/expert-cases/import/pdf')).set('Content-Type', 'application/pdf').send(pdfDe(ATA));

    const primeira = await enviar();
    expect(primeira.status).toBe(200);
    expect(primeira.body.data.draft).toMatchObject({
      numeroProcesso: '0001234-56.2026.5.02.0001',
      tribunal: 'TRT2',
      vara: '1ª Vara do Trabalho',
      comarca: 'São Paulo',
      objeto: 'Perícia de insalubridade',
      dataNomeacao: '2026-10-15',
      prazoLaudo: '2026-11-30',
    });
    expect(primeira.body.data).not.toHaveProperty('existingId');
    expect(await Pericia.countDocuments({})).toBe(0);

    const salva = await as(request(app).post('/expert-cases')).send(primeira.body.data.draft);
    expect(salva.status).toBe(201);
    expect(salva.body.data.partes).toHaveLength(2);

    const segunda = await enviar();
    expect(segunda.body.data.existingId).toBe(salva.body.data.id);
    expect(segunda.body.data.warnings).toContain('expert_case_already_registered');
  });

  it('recusa arquivo que não é PDF (415), PDF grande demais (413) e PDF sem texto (422) (IMP-01.5)', async () => {
    const { as } = await seedSession();
    const post = () => as(request(app).post('/expert-cases/import/pdf'));

    const tipo = await post().set('Content-Type', 'image/png').send(Buffer.from('x'));
    expect(tipo.status).toBe(415);
    expect(tipo.body.message).toBe('unsupported_file_type');

    const falso = await post().set('Content-Type', 'application/pdf').send(Buffer.from('não é pdf'));
    expect(falso.status).toBe(415);

    const grande = await post()
      .set('Content-Type', 'application/pdf')
      .send(Buffer.alloc(10 * 1024 * 1024 + 1));
    expect(grande.status).toBe(413);
    expect(grande.body.message).toBe('file_too_large');

    const semTexto = await post().set('Content-Type', 'application/pdf').send(pdfDe([]));
    expect(semTexto.status).toBe(422);
    expect(semTexto.body.message).toBe('pdf_without_text');
  });

  it('CSV com 3 válidas, 1 já cadastrada e 1 inválida ⇒ 3 criadas, 1 ignorada, 1 recusada (IMP-02.2–3)', async () => {
    const { as } = await seedSession();
    await as(request(app).post('/expert-cases')).send({
      numeroProcesso: '0000004-00.2026.5.02.0001',
      justica: 'labor',
      papel: 'court_expert',
      tribunal: 'TRT2',
      objeto: 'Já cadastrada',
    });
    const csv = [
      CABECALHO,
      '0000001-00.2026.5.02.0001;perito;Insalubridade;15/10/2026;30/11/2026;Indústria Exemplo;12.345.678/0001-95',
      '0000002-00.2026.8.26.0100;assistente;"Perícia contábil; apuração";2026-10-01;;Indústria Exemplo;12345678000195',
      '0000003-00.2026.4.03.6100;;Médica;;;;',
      '0000004-00.2026.5.02.0001;perito;Repetida;;;;',
      '123;perito;Inválida;;;;',
      '',
    ].join('\r\n');

    const res = await as(request(app).post('/expert-cases/import/csv')).set('Content-Type', 'text/csv').send(`﻿${csv}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      created: 3,
      skipped: [{ line: 5, numeroProcesso: '0000004-00.2026.5.02.0001' }],
      rejected: [{ line: 6, column: 'numero_processo', reason: 'invalid_process_number' }],
    });
    const civel = await Pericia.findOne({ numeroProcesso: '0000002-00.2026.8.26.0100' }).lean();
    expect(civel).toMatchObject({ justica: 'civil', tribunal: 'TJSP', papel: 'technical_assistant' });
    expect(civel?.objeto).toBe('Perícia contábil; apuração');
    // A mesma ré nas duas linhas vira um só cadastro (AD-115).
    expect(await Parte.countDocuments({})).toBe(1);
    expect(await Prazo.countDocuments({ titulo: 'Entrega do laudo' })).toBe(1);
  });

  it('CSV vazio ou sem coluna obrigatória é recusado inteiro', async () => {
    const { as } = await seedSession();
    const post = (body: string) =>
      as(request(app).post('/expert-cases/import/csv')).set('Content-Type', 'text/csv').send(body);

    const vazio = await post(`${CABECALHO}\n`);
    expect(vazio.status).toBe(400);
    expect(vazio.body.message).toBe('csv_empty');

    const semObjeto = await post('numero_processo;papel\n0000001-00.2026.5.02.0001;perito\n');
    expect(semObjeto.status).toBe(400);
    expect(semObjeto.body.message).toBe('csv_invalid_header');
  });
});
