import { PROFILE_PERMISSIONS } from '@ethica/contracts';
import type { AppointmentDocument, InstallmentDocument, TransactionDocument } from '@ethica/db';
import {
  Activity,
  Appointment,
  Case,
  connect,
  Deadline,
  dateInDisplayTz,
  disconnect,
  Inspection,
  Opportunity,
  Party,
  Report,
  Session,
  Template,
  Tenant,
  Transaction,
  User,
  wallClockToUtc,
} from '@ethica/db';
import bcrypt from 'bcrypt';
import { env } from '../src/config/env.config.js';
import { resolveVariables } from '../src/modules/documents/report.html.js';
import { DEFAULT_TEMPLATES } from '../src/modules/documents/report.library.js';

// Dev tool: creates (or recreates) the "Perícias Demo" demo tenant
// with a team, cases in several statuses, agenda, transactions and opportunities,
// with dates relative to today. Deletes only this tenant's data.
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

const CASES = [
  {
    number: '0001234-56.2026.5.02.0001',
    courtType: 'labor',
    court: 'TRT2',
    division: '1ª Vara do Trabalho de São Paulo',
    subject: 'Insalubridade por ruído',
    status: 'inspection',
    phase: 'awaiting_inspection',
    deadline: 12,
    proposed: 450_000,
  },
  {
    number: '0002345-67.2026.5.02.0011',
    courtType: 'labor',
    court: 'TRT2',
    division: '11ª Vara do Trabalho de São Paulo',
    subject: 'Periculosidade — inflamáveis',
    status: 'drafting_report',
    phase: 'reviewing_report',
    deadline: 3,
    proposed: 380_000,
    fixed: 350_000,
  },
  {
    number: '0003456-78.2025.8.26.0100',
    courtType: 'civil',
    court: 'TJSP',
    division: '5ª Vara Cível do Foro Central',
    subject: 'Vícios construtivos em edifício',
    status: 'appointed',
    deadline: 30,
    proposed: 900_000,
    // Technical assistant hired by the plaintiff (AD-135): contracted fee.
    fixed: 600_000,
  },
  {
    number: '0004567-89.2025.4.03.6100',
    courtType: 'federal',
    court: 'TRF3',
    division: '2ª Vara Federal Previdenciária',
    subject: 'Aposentadoria especial — agentes químicos',
    status: 'report_delivered',
    phase: 'awaiting_objections',
    deadline: -5,
    proposed: 320_000,
    fixed: 300_000,
  },
  {
    number: '0005678-90.2025.5.15.0032',
    courtType: 'labor',
    court: 'TRT15',
    division: 'Vara do Trabalho de Campinas',
    subject: 'Doença ocupacional — LER/DORT',
    status: 'clarifications',
    phase: 'answering_objection',
    deadline: -2,
    proposed: 400_000,
    fixed: 400_000,
  },
  {
    number: '0006789-01.2024.8.26.0224',
    courtType: 'civil',
    court: 'TJSP',
    division: '3ª Vara Cível de Guarulhos',
    subject: 'Avaliação de imóvel',
    status: 'completed',
    phase: 'fees_received',
    proposed: 250_000,
    fixed: 250_000,
  },
] as const;

const run = async (): Promise<void> => {
  await connect(env.MONGODB_URI);

  const old = await Tenant.findOne({ document: DOCUMENT }).lean();
  if (old) {
    const users = await User.find({ Tenant: old._id }).select('_id').lean();
    await Promise.all([
      Activity.deleteMany({ Tenant: old._id }),
      Case.deleteMany({ Tenant: old._id }),
      Party.deleteMany({ Tenant: old._id }),
      Deadline.deleteMany({ Tenant: old._id }),
      Appointment.deleteMany({ Tenant: old._id }),
      Inspection.deleteMany({ Tenant: old._id }),
      Transaction.deleteMany({ Tenant: old._id }),
      Opportunity.deleteMany({ Tenant: old._id }),
      Report.deleteMany({ Tenant: old._id }),
      Template.deleteMany({ Tenant: old._id }),
      Session.deleteMany({ user: { $in: users.map((user) => user._id) } }),
      User.deleteMany({ Tenant: old._id }),
      Tenant.deleteOne({ _id: old._id }),
    ]);
  }

  // Document identity (AD-121); the logo depends on storage and is left to the office screen.
  const tenant = await Tenant.create({
    name: 'Perícias Demo',
    document: DOCUMENT,
    status: 'active',
    header: '[LOGO]\nPerícias Demo — Engenharia de Segurança do Trabalho\nRua das Perícias, 100 — São Paulo/SP',
    footer: '[NOME_PERITO] · Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]',
  });
  const password = await bcrypt.hash(PASSWORD, 10);
  const [admin] = await User.create(
    (['admin', 'manager', 'operator'] as const).map((role) => ({
      name: `${role[0]?.toUpperCase()}${role.slice(1)} Demo`,
      email: `${role}@pericias.example.com`,
      password,
      Tenant: tenant._id,
      role: [role],
      // Permission matrix (AD-137): manager and operator with the profile preset; admin has everything.
      ...(role === 'admin' ? {} : { permissions: PROFILE_PERMISSIONS[role] }),
      // Professional data for documents (DOC-01).
      ...(role === 'admin'
        ? {
            cpf: '52998224725',
            professionalRegistration: 'CREA-SP 5061234567',
            education: 'Engenharia de Segurança do Trabalho',
          }
        : {}),
    })),
  );

  // Reusable parties and lawyers (AD-117): the same defendant and lawyers in several processes.
  const [maria, jose, aurora, industria, construtora, inss, joao, ana] = await Party.insertMany(
    [
      { type: 'party', name: 'Maria da Silva', document: '12345678909', phone: '(11) 98888-1000' },
      { type: 'party', name: 'José Santos', document: '98765432100' },
      { type: 'party', name: 'Condomínio Edifício Aurora', document: '11222333000181' },
      { type: 'party', name: 'Indústria Exemplo Ltda.', document: '12345678000195', email: 'juridico@exemplo.com' },
      { type: 'party', name: 'Construtora Alfa S.A.', document: '33444555000172' },
      { type: 'party', name: 'Instituto Nacional do Seguro Social' },
      { type: 'lawyer', name: 'João Pereira', oab: 'SP123456', email: 'joao@advocacia.com' },
      { type: 'lawyer', name: 'Ana Souza', oab: 'SP654321' },
    ].map((party) => ({ ...party, Tenant: tenant._id })),
  );
  const party = (doc: typeof maria, side: 'plaintiff' | 'defendant') =>
    doc ? [{ Party: doc._id, side, type: doc.type, name: doc.name }] : [];
  const PARTIES = [
    [maria, industria],
    [jose, industria],
    [aurora, construtora],
    [jose, inss],
    [maria, industria],
    [aurora, construtora],
  ];

  const cases = await Case.insertMany(
    CASES.map((p, index) => ({
      Tenant: tenant._id,
      processNumber: p.number,
      courtType: p.courtType,
      role: index === 2 ? 'technical_assistant' : 'court_expert',
      court: p.court,
      division: p.division,
      district: p.court === 'TRT15' ? 'Campinas' : 'São Paulo',
      subject: p.subject,
      parties: [
        // In the technical assistant case (index 2), the plaintiff is the client (AD-135).
        ...party(PARTIES[index]?.[0], 'plaintiff').map((item) => (index === 2 ? { ...item, client: true } : item)),
        ...party(joao, 'plaintiff'),
        ...party(PARTIES[index]?.[1], 'defendant'),
        ...party(ana, 'defendant'),
      ],
      // Labor report auxiliary data (IMP-04).
      ...(p.courtType === 'labor'
        ? {
            docketingDate: day(-120),
            hireDate: '2017-03-01',
            terminationDate: day(-150),
            claimantJob: 'Operador(a) de máquinas',
            nonPrescribedPeriodStart: day(-120 - 5 * 365),
            nonPrescribedPeriodEnd: day(-150),
            location: 'Av. Industrial, 1500 — São Paulo/SP',
          }
        : {}),
      status: p.status,
      ...('phase' in p ? { phase: p.phase } : {}),
      // The civil one (index 2) was nominated 95 days ago and never moved: it shows up in stalled cases.
      nominationDate: index === 2 ? day(-95) : day(-40 + index * 3),
      // Movements (AD-121): report delivered 70 days ago (stalled) and a recent summons (active).
      movements:
        p.status === 'report_delivered'
          ? [{ type: 'report_filed', date: day(-70) }]
          : p.status === 'clarifications'
            ? [
                { type: 'report_filed', date: day(-30) },
                { type: 'clarification_summons', date: day(-8), notes: 'Quesitos complementares da reclamada' },
              ]
            : [],
      proposedFeesCents: p.proposed,
      fixedFeesCents: 'fixed' in p ? p.fixed : undefined,
    })),
  );
  const [inspection, report, civil, federal, clarifications] = cases;

  // Deadlines (AD-109): each case's report delivery, filed on those already delivered,
  // and a clarifications deadline already filed to show the history.
  await Deadline.insertMany([
    ...CASES.flatMap((p, index) => {
      const legalCase = cases[index];
      if (!('deadline' in p) || !legalCase) return [];
      const entregue = ['report_delivered', 'completed'].includes(p.status);
      return [
        {
          Tenant: tenant._id,
          Case: legalCase._id,
          title: 'Entrega do laudo',
          dueDate: day(p.deadline),
          status: entregue ? ('filed' as const) : ('pending' as const),
          filedDate: entregue ? day(p.deadline - 1) : undefined,
        },
      ];
    }),
    {
      Tenant: tenant._id,
      Case: clarifications?._id,
      title: 'Resposta à impugnação',
      dueDate: day(10),
      status: 'pending' as const,
    },
  ]);

  const appointments: Partial<AppointmentDocument>[] = [
    // Today's field route (CAM-01): two inspections at real addresses for the map.
    {
      type: 'inspection',
      title: 'Vistoria na estamparia',
      start: at(0, '09:00'),
      end: at(0, '11:00'),
      location: 'Avenida Paulista, 1578, São Paulo, SP',
      Case: inspection?._id,
    },
    {
      type: 'inspection',
      title: 'Vistoria no almoxarifado',
      start: at(0, '14:00'),
      end: at(0, '15:30'),
      location: 'Rua Vergueiro, 1000, São Paulo, SP',
      Case: clarifications?._id,
    },
    {
      type: 'inspection',
      title: 'Vistoria na linha de prensas',
      start: at(1, '09:00'),
      end: at(1, '11:00'),
      location: 'Av. Industrial, 1500 — São Paulo',
      Case: inspection?._id,
    },
    {
      type: 'hearing',
      title: 'Audiência de esclarecimentos',
      start: at(4, '14:00'),
      end: at(4, '15:00'),
      location: 'Fórum Trabalhista de Campinas',
      Case: clarifications?._id,
    },
    {
      type: 'meeting',
      title: 'Reunião com assistente técnico',
      start: at(6, '10:00'),
      end: at(6, '11:00'),
      Case: civil?._id,
    },
    {
      type: 'inspection',
      title: 'Vistoria no edifício',
      start: at(9, '08:30'),
      end: at(9, '12:00'),
      location: 'Rua das Flores, 100',
      Case: civil?._id,
    },
    {
      type: 'inspection',
      title: 'Vistoria no posto de combustível',
      start: at(-6, '09:00'),
      end: at(-6, '10:30'),
      Case: report?._id,
      status: 'done',
    },
  ];
  const criados = await Appointment.insertMany(
    appointments.map((appointment) => ({ ...appointment, Tenant: tenant._id })),
  );

  // Record of the inspection already done (AD-130): feeds the field variables of the draft report.
  const done = criados.find((appointment) => appointment.status === 'done');
  await Inspection.create({
    Tenant: tenant._id,
    Appointment: done?._id,
    Case: report?._id,
    version: 1,
    data: {
      attendees: [
        { id: 'p1', name: 'José Santos', capacity: 'plaintiff' },
        { id: 'p2', name: 'João Pereira', capacity: 'plaintiff_lawyer', email: 'joao@advocacia.com' },
        { id: 'p3', name: 'Carlos Lima (encarregado)', capacity: 'defendant' },
      ],
      comparators: [{ id: 'g1', side: 'plaintiff', name: 'Pedro Alves', job: 'Frentista', workedTogether: true }],
      jobs: [
        {
          id: 'f1',
          title: 'Frentista',
          yearStart: 2017,
          yearEnd: 2026,
          location: 'Pista de abastecimento',
          plaintiff: {
            activities: 'Abastecia veículos e conferia bombas',
            frequency: 'diária',
            timeExposure: '8h/dia',
          },
          defendant: { activities: 'Abastecia veículos', frequency: 'diária', timeExposure: '6h/dia' },
        },
      ],
      agents: [
        { agent: 'hazardous', present: 'yes', notes: 'área de risco das bombas' },
        { agent: 'noise', present: 'no' },
      ],
      documents: [
        { id: 'd1', document: 'risk_program', requested: true },
        { id: 'd2', document: 'ppe_records', requested: true },
      ],
      notes: 'Encarregado confirmou a rotina na pista.',
    },
    media: [],
  });

  // Six months of movement for the cash flow.
  const transactions: Partial<TransactionDocument>[] = [];
  for (let month = 5; month >= 0; month -= 1) {
    const offset = -month * 30;
    transactions.push(
      {
        kind: 'income',
        category: 'advance_fees',
        description: 'Honorários prévios',
        amountCents: 150_000 + month * 20_000,
        dueDate: day(offset - 10),
        status: 'settled',
        installments: [{ amountCents: 150_000 + month * 20_000, date: day(offset - 8) } as InstallmentDocument],
      },
      {
        kind: 'expense',
        category: 'travel',
        description: 'Deslocamento para vistoria',
        amountCents: 18_000 + month * 1_500,
        dueDate: day(offset - 5),
        status: 'settled',
        settledDate: day(offset - 5),
      },
    );
  }
  transactions.push(
    {
      kind: 'income',
      category: 'fixed_fees',
      description: `Honorários fixados — ${report?.processNumber}`,
      amountCents: 350_000,
      dueDate: day(20),
      status: 'expected',
      Case: report?._id,
    },
    {
      kind: 'income',
      category: 'contracted_fees',
      description: `Honorários contratados — ${civil?.processNumber}`,
      amountCents: 600_000,
      dueDate: day(25),
      status: 'expected',
      Case: civil?._id,
    },
    {
      kind: 'income',
      category: 'fixed_fees',
      description: `Honorários fixados — ${federal?.processNumber}`,
      amountCents: 300_000,
      dueDate: day(-12),
      status: 'expected',
      Case: federal?._id,
    },
    {
      kind: 'income',
      category: 'fixed_fees',
      description: `Honorários fixados — ${clarifications?.processNumber}`,
      amountCents: 480_000,
      dueDate: day(-20),
      // Partial receipt (AD-111): court release of R$ 1,500.00, balance of R$ 3,300.00.
      status: 'partial',
      installments: [{ amountCents: 150_000, date: day(-18), account: 'Banco do Brasil' } as InstallmentDocument],
      Case: clarifications?._id,
    },
    {
      kind: 'expense',
      category: 'supplies',
      description: 'Decibelímetro — calibração',
      amountCents: 45_000,
      dueDate: day(7),
      status: 'expected',
    },
    {
      kind: 'expense',
      category: 'fees_and_taxes',
      description: 'Anuidade do conselho',
      amountCents: 62_000,
      dueDate: day(15),
      status: 'expected',
    },
  );
  await Transaction.insertMany(transactions.map((transaction) => ({ ...transaction, Tenant: tenant._id })));

  // Reports (AD-126): an office template cloned from the default and a draft report of the case
  // being drafted, with the hazardous conditions sections and a pending variable to show the lock.
  const isDefault = DEFAULT_TEMPLATES.report;
  await Template.create({
    Tenant: tenant._id,
    name: 'Periculosidade — inflamáveis (escritório)',
    type: 'report',
    sections: isDefault.sections
      .filter((section) => !section.title.includes('NR-15') && !/^Anexo \d+ — (?!Inflamáveis)/.test(section.title))
      .map(({ id: _id, ...section }) => section),
  });
  const values = {
    '[NUMERO_PROCESSO]': CASES[1].number,
    '[TRIBUNAL]': CASES[1].court,
    '[VARA]': CASES[1].division,
    '[OBJETO]': CASES[1].subject,
    '[NOME_AUTOR]': 'José Santos',
    '[NOME_REU]': 'Indústria Exemplo Ltda.',
    '[DENOMINACAO_AUTOR]': 'Reclamante',
    '[DENOMINACAO_REU]': 'Reclamada',
    '[FUNCAO_RECLAMANTE]': 'Operador(a) de máquinas',
    '[LOCAL_PERICIA]': 'Av. Industrial, 1500 — São Paulo/SP',
    '[PERITO_NOME]': 'Admin Demo',
    '[PERITO_REGISTRO]': 'CREA-SP 5061234567',
    '[PERITO_FORMACAO]': 'Engenharia de Segurança do Trabalho',
  };
  const CHOICE: Record<string, 'yes' | 'no'> = {
    'Identificação do processo': 'yes',
    Objetivo: 'yes',
    'Metodologia e vistoria': 'yes',
    'Atividades exercidas': 'yes',
    'Equipamentos de proteção individual': 'no',
    'Periculosidade — NR-16': 'yes',
    'Anexo 2 — Inflamáveis': 'yes',
    Conclusão: 'yes',
    'Honorários periciais': 'no',
    Encerramento: 'yes',
  };
  await Report.create({
    Tenant: tenant._id,
    Case: report?._id,
    type: 'report',
    status: 'draft',
    title: 'Laudo pericial',
    templateName: isDefault.name,
    CreatedBy: admin?._id,
    sections: isDefault.sections
      .filter((section) => section.title in CHOICE)
      .map((section) => {
        const variant = CHOICE[section.title] ?? 'yes';
        return {
          title: resolveVariables(section.title, values, 'text'),
          level: section.level,
          titleOnly: section.titleOnly,
          pageBreak: section.pageBreak,
          variant,
          html: resolveVariables(variant === 'yes' ? section.yesText : section.noText, values, 'html'),
        };
      }),
  });

  await Opportunity.create([
    {
      Tenant: tenant._id,
      processNumber: '0007890-12.2026.5.02.0045',
      court: 'trt2',
      caseClass: 'Ação Trabalhista - Rito Ordinário',
      subjects: ['Adicional de Insalubridade'],
      courtUnit: '45ª Vara do Trabalho de São Paulo',
      lastMovement: 'Determinada a realização de perícia',
      status: 'new',
    },
    {
      Tenant: tenant._id,
      processNumber: '0008901-23.2026.5.15.0001',
      court: 'trt15',
      caseClass: 'Ação Trabalhista - Rito Sumaríssimo',
      subjects: ['Doença Ocupacional'],
      courtUnit: '1ª Vara do Trabalho de Campinas',
      lastMovement: 'Nomeado perito',
      status: 'under_review',
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
