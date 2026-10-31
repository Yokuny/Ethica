import type { CompromissoDocument, LancamentoDocument } from '@ethica/db';
import {
  Compromisso,
  connect,
  dateInDisplayTz,
  disconnect,
  Lancamento,
  Oportunidade,
  Pericia,
  Prazo,
  Session,
  Tenant,
  User,
  wallClockToUtc,
} from '@ethica/db';
import bcrypt from 'bcrypt';
import { env } from '../src/config/env.config.js';

// Ferramenta de dev: cria (ou recria) o tenant de demonstração "Perícias Demo"
// com equipe, perícias em várias etapas, agenda, lançamentos e oportunidades,
// com datas relativas a hoje. Apaga só os dados desse tenant.
//
//   pnpm --filter api run seed:demo
const DOCUMENT = '99888777000166';
const PASSWORD = process.env.SEED_PASSWORD || 'asdQWE123!@#';

const today = dateInDisplayTz(new Date());
const day = (offset: number): string => {
  const date = new Date(`${today}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const at = (offset: number, time: string) => wallClockToUtc(day(offset), time);

const PERICIAS = [
  {
    numero: '0001234-56.2026.5.02.0001',
    justica: 'trabalhista',
    tribunal: 'TRT2',
    vara: '1ª Vara do Trabalho de São Paulo',
    objeto: 'Insalubridade por ruído',
    status: 'vistoria',
    prazo: 12,
    propostos: 450_000,
  },
  {
    numero: '0002345-67.2026.5.02.0011',
    justica: 'trabalhista',
    tribunal: 'TRT2',
    vara: '11ª Vara do Trabalho de São Paulo',
    objeto: 'Periculosidade — inflamáveis',
    status: 'em_laudo',
    prazo: 3,
    propostos: 380_000,
    fixados: 350_000,
  },
  {
    numero: '0003456-78.2025.8.26.0100',
    justica: 'civel',
    tribunal: 'TJSP',
    vara: '5ª Vara Cível do Foro Central',
    objeto: 'Vícios construtivos em edifício',
    status: 'nomeada',
    prazo: 30,
    propostos: 900_000,
  },
  {
    numero: '0004567-89.2025.4.03.6100',
    justica: 'federal',
    tribunal: 'TRF3',
    vara: '2ª Vara Federal Previdenciária',
    objeto: 'Aposentadoria especial — agentes químicos',
    status: 'laudo_entregue',
    prazo: -5,
    propostos: 320_000,
    fixados: 300_000,
  },
  {
    numero: '0005678-90.2025.5.15.0032',
    justica: 'trabalhista',
    tribunal: 'TRT15',
    vara: 'Vara do Trabalho de Campinas',
    objeto: 'Doença ocupacional — LER/DORT',
    status: 'esclarecimentos',
    prazo: -2,
    propostos: 400_000,
    fixados: 400_000,
  },
  {
    numero: '0006789-01.2024.8.26.0224',
    justica: 'civel',
    tribunal: 'TJSP',
    vara: '3ª Vara Cível de Guarulhos',
    objeto: 'Avaliação de imóvel',
    status: 'concluida',
    propostos: 250_000,
    fixados: 250_000,
  },
] as const;

const run = async (): Promise<void> => {
  await connect(env.MONGODB_URI);

  const old = await Tenant.findOne({ document: DOCUMENT }).lean();
  if (old) {
    const users = await User.find({ Tenant: old._id }).select('_id').lean();
    await Promise.all([
      Pericia.deleteMany({ Tenant: old._id }),
      Prazo.deleteMany({ Tenant: old._id }),
      Compromisso.deleteMany({ Tenant: old._id }),
      Lancamento.deleteMany({ Tenant: old._id }),
      Oportunidade.deleteMany({ Tenant: old._id }),
      Session.deleteMany({ user: { $in: users.map((user) => user._id) } }),
      User.deleteMany({ Tenant: old._id }),
      Tenant.deleteOne({ _id: old._id }),
    ]);
  }

  const tenant = await Tenant.create({ name: 'Perícias Demo', document: DOCUMENT, status: 'active' });
  const password = await bcrypt.hash(PASSWORD, 10);
  await User.create(
    (['admin', 'manager', 'operator'] as const).map((role) => ({
      name: `${role[0]?.toUpperCase()}${role.slice(1)} Demo`,
      email: `${role}@pericias.example.com`,
      password,
      Tenant: tenant._id,
      role: [role],
    })),
  );

  const pericias = await Pericia.insertMany(
    PERICIAS.map((p, index) => ({
      Tenant: tenant._id,
      numeroProcesso: p.numero,
      justica: p.justica,
      papel: index === 2 ? 'assistente_tecnico' : 'perito',
      tribunal: p.tribunal,
      vara: p.vara,
      comarca: p.tribunal === 'TRT15' ? 'Campinas' : 'São Paulo',
      objeto: p.objeto,
      autor: 'Maria da Silva',
      reu: 'Indústria Exemplo Ltda.',
      status: p.status,
      dataNomeacao: day(-40 + index * 3),
      honorariosPropostosCents: p.propostos,
      honorariosFixadosCents: 'fixados' in p ? p.fixados : undefined,
    })),
  );
  const [vistoria, laudo, civel, federal, esclarecimentos] = pericias;

  // Prazos (AD-109): a entrega do laudo de cada perícia, protocolada nas que já entregaram,
  // e um prazo de esclarecimentos já protocolado para mostrar o histórico.
  await Prazo.insertMany([
    ...PERICIAS.flatMap((p, index) => {
      const pericia = pericias[index];
      if (!('prazo' in p) || !pericia) return [];
      const entregue = ['laudo_entregue', 'concluida'].includes(p.status);
      return [
        {
          Tenant: tenant._id,
          Pericia: pericia._id,
          titulo: 'Entrega do laudo',
          vencimento: day(p.prazo),
          status: entregue ? ('protocolado' as const) : ('pendente' as const),
          protocoladoEm: entregue ? day(p.prazo - 1) : undefined,
        },
      ];
    }),
    {
      Tenant: tenant._id,
      Pericia: esclarecimentos?._id,
      titulo: 'Resposta à impugnação',
      vencimento: day(10),
      status: 'pendente' as const,
    },
  ]);

  const compromissos: Partial<CompromissoDocument>[] = [
    {
      tipo: 'vistoria',
      titulo: 'Vistoria na linha de prensas',
      inicio: at(1, '09:00'),
      fim: at(1, '11:00'),
      local: 'Av. Industrial, 1500 — São Paulo',
      Pericia: vistoria?._id,
    },
    {
      tipo: 'audiencia',
      titulo: 'Audiência de esclarecimentos',
      inicio: at(4, '14:00'),
      fim: at(4, '15:00'),
      local: 'Fórum Trabalhista de Campinas',
      Pericia: esclarecimentos?._id,
    },
    {
      tipo: 'reuniao',
      titulo: 'Reunião com assistente técnico',
      inicio: at(6, '10:00'),
      fim: at(6, '11:00'),
      Pericia: civel?._id,
    },
    {
      tipo: 'vistoria',
      titulo: 'Vistoria no edifício',
      inicio: at(9, '08:30'),
      fim: at(9, '12:00'),
      local: 'Rua das Flores, 100',
      Pericia: civel?._id,
    },
    {
      tipo: 'vistoria',
      titulo: 'Vistoria no posto de combustível',
      inicio: at(-6, '09:00'),
      fim: at(-6, '10:30'),
      Pericia: laudo?._id,
      status: 'concluido',
    },
  ];
  await Compromisso.insertMany(compromissos.map((compromisso) => ({ ...compromisso, Tenant: tenant._id })));

  // Seis meses de movimento para o fluxo de caixa.
  const lancamentos: Partial<LancamentoDocument>[] = [];
  for (let month = 5; month >= 0; month -= 1) {
    const offset = -month * 30;
    lancamentos.push(
      {
        natureza: 'receita',
        categoria: 'honorarios_previos',
        descricao: 'Honorários prévios',
        valorCents: 150_000 + month * 20_000,
        vencimento: day(offset - 10),
        status: 'liquidado',
        liquidadoEm: day(offset - 8),
      },
      {
        natureza: 'despesa',
        categoria: 'deslocamento',
        descricao: 'Deslocamento para vistoria',
        valorCents: 18_000 + month * 1_500,
        vencimento: day(offset - 5),
        status: 'liquidado',
        liquidadoEm: day(offset - 5),
      },
    );
  }
  lancamentos.push(
    {
      natureza: 'receita',
      categoria: 'honorarios_fixados',
      descricao: `Honorários fixados — ${laudo?.numeroProcesso}`,
      valorCents: 350_000,
      vencimento: day(20),
      status: 'previsto',
      Pericia: laudo?._id,
    },
    {
      natureza: 'receita',
      categoria: 'honorarios_fixados',
      descricao: `Honorários fixados — ${federal?.numeroProcesso}`,
      valorCents: 300_000,
      vencimento: day(-12),
      status: 'previsto',
      Pericia: federal?._id,
    },
    {
      natureza: 'receita',
      categoria: 'honorarios_parciais',
      descricao: `1ª parcela — ${esclarecimentos?.numeroProcesso}`,
      valorCents: 200_000,
      vencimento: day(-20),
      status: 'liquidado',
      liquidadoEm: day(-18),
      Pericia: esclarecimentos?._id,
    },
    {
      natureza: 'despesa',
      categoria: 'material',
      descricao: 'Decibelímetro — calibração',
      valorCents: 45_000,
      vencimento: day(7),
      status: 'previsto',
    },
    {
      natureza: 'despesa',
      categoria: 'taxas',
      descricao: 'Anuidade do conselho',
      valorCents: 62_000,
      vencimento: day(15),
      status: 'previsto',
    },
  );
  await Lancamento.insertMany(lancamentos.map((lancamento) => ({ ...lancamento, Tenant: tenant._id })));

  await Oportunidade.create([
    {
      Tenant: tenant._id,
      numeroProcesso: '0007890-12.2026.5.02.0045',
      tribunal: 'trt2',
      classe: 'Ação Trabalhista - Rito Ordinário',
      assuntos: ['Adicional de Insalubridade'],
      orgaoJulgador: '45ª Vara do Trabalho de São Paulo',
      ultimoMovimento: 'Determinada a realização de perícia',
      status: 'nova',
    },
    {
      Tenant: tenant._id,
      numeroProcesso: '0008901-23.2026.5.15.0001',
      tribunal: 'trt15',
      classe: 'Ação Trabalhista - Rito Sumaríssimo',
      assuntos: ['Doença Ocupacional'],
      orgaoJulgador: '1ª Vara do Trabalho de Campinas',
      ultimoMovimento: 'Nomeado perito',
      status: 'em_analise',
    },
  ]);

  console.log(
    JSON.stringify({
      event: 'seed.demo.done',
      tenant: tenant.id,
      logins: ['admin', 'manager', 'operator'].map((r) => `${r}@pericias.example.com`),
    }),
  );
  await disconnect();
};

void run();
