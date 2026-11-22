import {
  type CasePhase,
  type CourtType,
  deadlineAgendaEntries,
  formatServiceOrder,
  PROFILE_PERMISSIONS,
  SERVICE_ORDER_PATTERN_DEFAULT,
  TECHNICAL_ASSISTANCE_PHASES,
  transactionAgendaEntries,
} from '@ethica/contracts';
import {
  Appointment,
  CalendarEntry,
  Case,
  CourtDivision,
  connect,
  Deadline,
  dateInDisplayTz,
  disconnect,
  Opportunity,
  Party,
  Report,
  ServiceOrderSequence,
  Transaction,
  User,
  wallClockToUtc,
} from '@ethica/db';
import { env } from '../src/config/env.config.js';
import { resolveVariables } from '../src/modules/documents/report.html.js';
import { DEFAULT_TEMPLATES } from '../src/modules/documents/report.library.js';
import type { TemplateRecord } from '../src/modules/documents/report.schema.js';

// Dev tool: fills the office of an existing login with a large volume of data for visual checks — parties,
// court divisions, services of every type, phase and status (some with empty fields), deadlines, agenda,
// twelve months of transactions, opportunities and draft reports, with dates relative to today. It only adds:
// every run creates new records (new process numbers and the next service orders), nothing is deleted.
//
//   pnpm --filter api run seed:volume <login e-mail>
const email = process.argv[2];

// Same random sequence for the same start, a different one on each run.
let state = Date.now() % 2_147_483_647;
const random = (): number => {
  state = (state * 48_271) % 2_147_483_647;
  return state / 2_147_483_647;
};
const int = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
const chance = (probability: number): boolean => random() < probability;
const digits = (length: number): string => Array.from({ length }, () => int(0, 9)).join('');
// Lowercase ASCII words of a name, for mailboxes and domains that read like the real ones.
const words = (name: string): string[] =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter((word) => word.length > 2 && !['ltda', 'dos', 'das', 'sul'].includes(word));
const mailbox = (name: string): string => {
  const parts = words(name);
  return `${parts[0]}.${parts.at(-1)}@${pick(['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br'])}`;
};
const DRIVE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const driveFolder = (): string =>
  `https://drive.google.com/drive/folders/1${Array.from({ length: 32 }, () => pick([...DRIVE_CHARS])).join('')}`;

const today = dateInDisplayTz(new Date());
const day = (offset: number): string => {
  const date = new Date(`${today}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const at = (offset: number, time: string) => wallClockToUtc(day(offset), time);

const FIRST = ['Maria', 'José', 'Ana', 'Carlos', 'Fernanda', 'Paulo', 'Juliana', 'Ricardo', 'Patrícia', 'Marcos'];
const MIDDLE = ['da Silva', 'Souza', 'Oliveira', 'Pereira', 'Lima', 'Ferreira', 'Almeida', 'Costa', 'Ribeiro'];
const LAST = ['Santos', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Rocha', 'Cardoso', 'Teixeira'];
const COMPANIES = [
  'Metalúrgica Paulista Ltda.',
  'Transportes Rodovia Sul S.A.',
  'Construtora Horizonte Ltda.',
  'Supermercados Bom Preço Ltda.',
  'Indústria Química Vale Verde S.A.',
  'Hospital Santa Clara',
  'Posto Estrela Combustíveis Ltda.',
  'Têxtil Nova Aurora Ltda.',
  'Frigorífico Serra Azul S.A.',
  'Condomínio Residencial Primavera',
  'Banco Regional do Brasil S.A.',
  'Logística Expressa Ltda.',
  'RGE SUL DISTRIBUIDORA DE ENERGIA S.A.',
  'MUNICIPIO DE MONTE ALEGRE DOS CAMPOS',
  'Instituto Nacional do Seguro Social',
];
const STREETS = [
  'Avenida Paulista, 1578, São Paulo, SP',
  'Rua Vergueiro, 1000, São Paulo, SP',
  'Avenida Brigadeiro Faria Lima, 2232, São Paulo, SP',
  'Rua Augusta, 900, São Paulo, SP',
  'Avenida Ipiranga, 344, São Paulo, SP',
  'Rua da Consolação, 2302, São Paulo, SP',
  'Avenida Rebouças, 3970, São Paulo, SP',
  'Rua Domingos de Morais, 2564, São Paulo, SP',
  'Avenida Jabaquara, 1100, São Paulo, SP',
  'Rua Voluntários da Pátria, 2000, São Paulo, SP',
];

const COURTS: Record<CourtType, { court: string; divisions: string[]; district: string; segment: string }[]> = {
  labor: [
    {
      court: 'TRT2',
      divisions: [
        '1ª Vara do Trabalho de São Paulo',
        '11ª Vara do Trabalho de São Paulo',
        '45ª Vara do Trabalho de São Paulo',
      ],
      district: 'São Paulo',
      segment: '5.02',
    },
    {
      court: 'TRT15',
      divisions: ['1ª Vara do Trabalho de Campinas', 'Vara do Trabalho de Jundiaí'],
      district: 'Campinas',
      segment: '5.15',
    },
    { court: 'TRT4', divisions: ['3ª Vara do Trabalho de Porto Alegre'], district: 'Porto Alegre', segment: '5.04' },
  ],
  civil: [
    {
      court: 'TJSP',
      divisions: ['5ª Vara Cível do Foro Central', '3ª Vara Cível de Guarulhos', '2ª Vara da Fazenda Pública'],
      district: 'São Paulo',
      segment: '8.26',
    },
    {
      court: 'TJRS',
      divisions: ['Juízo da 3ª Vara Cível da Comarca de Novo Hamburgo', '1ª Vara Cível da Comarca de Canoas'],
      district: 'Novo Hamburgo',
      segment: '8.21',
    },
  ],
  federal: [
    {
      court: 'TRF3',
      divisions: ['2ª Vara Federal Previdenciária', '1ª Vara Federal de Santos'],
      district: 'São Paulo',
      segment: '4.03',
    },
    { court: 'TRF4', divisions: ['Vara Federal de Canoas'], district: 'Canoas', segment: '4.04' },
  ],
};
const SUBJECTS: Record<CourtType, string[]> = {
  labor: [
    'Insalubridade por ruído',
    'Periculosidade — inflamáveis',
    'Doença ocupacional — LER/DORT',
    'Insalubridade por agentes químicos',
    'Periculosidade — eletricidade',
    'Acidente de trabalho — prensa',
  ],
  civil: [
    'Vícios construtivos em edifício',
    'Avaliação de imóvel',
    'Reprodução simulada de acidente',
    'Infiltração em unidade condominial',
    'Inventário florestal',
    'Desapropriação — avaliação de área',
  ],
  federal: [
    'Aposentadoria especial — agentes químicos',
    'Aposentadoria especial — ruído',
    'Auxílio-acidente — perícia técnica',
  ],
};
const OWN_TYPES = [
  {
    serviceType: 'Parceria',
    subjects: ['Vistoria de imóvel urbano', 'Vistoria lote urbano + voo de drone', 'Serviços diversos'],
  },
  { serviceType: 'Vistoria cautelar', subjects: ['Vistoria cautelar de vizinhança', 'Vistoria de entrega de obra'] },
  { serviceType: 'Laudo de avaliação', subjects: ['Avaliação de imóvel comercial', 'Avaliação de terreno rural'] },
  {
    serviceType: 'Consultoria',
    subjects: ['Programa de gerenciamento de riscos', 'Laudo de insalubridade da empresa'],
  },
];
const OWN_PHASES = ['Contratado', 'Em andamento', 'Entregue', 'Finalizado', 'Aguardando pagamento'];
const PERICIA_PHASES: CasePhase[] = [
  'nomination_accepted',
  'fee_proposal',
  'document_request',
  'awaiting_scheduling',
  'inspection_scheduled',
  'inspection_done',
  'drafting_report',
  'reviewing_report',
  'report_delivered',
  'objection_reply',
  'clarifications',
  'awaiting_judge',
  'evidence_closed',
  'fees_received',
  'settlement',
];
const DELIVERED: CasePhase[] = [
  'report_delivered',
  'objection_reply',
  'clarifications',
  'awaiting_judge',
  'evidence_closed',
  'fees_received',
];
const DEADLINE_TITLES = [
  'Entrega do laudo',
  'Resposta à impugnação',
  'Esclarecimentos',
  'Proposta de honorários',
  'Juntada de documentos',
  'Cobrar o depósito dos honorários',
];
const ALERT_TITLES = ['Conferir o andamento do processo', 'Ligar para o assistente técnico', 'Separar os equipamentos'];

const run = async (): Promise<void> => {
  if (env.NODE_ENV === 'production') throw new Error('seed:volume não roda em produção');
  if (!email) throw new Error('informe o e-mail do login: pnpm --filter api run seed:volume <e-mail>');
  await connect(env.MONGODB_URI);
  const owner = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!owner) throw new Error(`nenhum usuário com o e-mail ${email}`);
  const Tenant = owner.Tenant;
  if (!Tenant) throw new Error(`o usuário ${email} não tem escritório`);
  const scoped = <T extends object>(list: T[]) => list.map((item) => ({ ...item, Tenant }));
  const run = digits(4);

  // Team: a manager and an operator per run, with the profile presets (AD-137).
  await User.insertMany(
    (['manager', 'operator'] as const).map((role) => {
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      return {
        Tenant,
        name,
        email: `${words(name).join('.')}${run.slice(-2)}@gmail.com`,
        role: [role],
        permissions: PROFILE_PERMISSIONS[role],
      };
    }),
  );

  // Parties and lawyers, reused across services (AD-117).
  const people = await Party.insertMany(
    scoped(
      Array.from({ length: 40 }, () => ({
        type: 'party' as const,
        name: `${pick(FIRST)} ${pick(MIDDLE)} ${pick(LAST)}`,
        ...(chance(0.6) ? { document: digits(11) } : {}),
        ...(chance(0.5) ? { phone: `(11) 9${digits(4)}-${digits(4)}` } : {}),
      })),
    ),
  );
  const companies = await Party.insertMany(
    scoped(
      COMPANIES.map((name) => ({
        type: 'party' as const,
        name,
        ...(chance(0.7) ? { document: digits(14) } : {}),
        ...(chance(0.4) ? { email: `juridico@${words(name).slice(0, 2).join('')}.com.br` } : {}),
      })),
    ),
  );
  const lawyers = await Party.insertMany(
    scoped(
      Array.from({ length: 12 }, () => ({
        type: 'lawyer' as const,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        oab: `SP${digits(6)}`,
      })).map((lawyer) =>
        chance(0.5)
          ? { ...lawyer, email: `${words(lawyer.name).join('.')}@${words(lawyer.name).at(-1)}adv.com.br` }
          : lawyer,
      ),
    ),
  );

  // Court divisions with their contacts.
  await CourtDivision.insertMany(
    scoped(
      Object.entries(COURTS).flatMap(([courtType, courts]) =>
        courts.flatMap((court) =>
          court.divisions.map((name) => ({
            courtType,
            name,
            court: court.court,
            state: court.court.endsWith('4') || court.court === 'TJRS' ? 'RS' : 'SP',
            city: court.district,
            ...(chance(0.7) ? { address: pick(STREETS) } : {}),
            ...(chance(0.7) ? { phones: `(11) 3${digits(3)}-${digits(4)}` } : {}),
            ...(chance(0.5)
              ? { email: `${words(name).slice(0, 3).join('')}@${court.court.toLowerCase()}.jus.br` }
              : {}),
          })),
        ),
      ),
    ),
  );

  // Service orders continue the office's sequence (AD-190); without one, the pattern of the office in the photo.
  const year = Number(today.slice(0, 4));
  const sequence =
    (await ServiceOrderSequence.findOne({ Tenant }).lean()) ??
    (
      await ServiceOrderSequence.create({
        Tenant,
        pattern: '[NUMERO]-[ANO]-[SIGLA]',
        prefix: 'ETH',
        digits: 3,
        year,
        last: 0,
      })
    ).toObject();
  let last = sequence.year === year ? sequence.last : 0;
  const nextServiceOrder = () => {
    last += 1;
    return formatServiceOrder({
      pattern: sequence.pattern ?? SERVICE_ORDER_PATTERN_DEFAULT,
      prefix: sequence.prefix ?? '',
      digits: sequence.digits ?? 3,
      year,
      last,
    });
  };

  const side = (
    doc: { _id: unknown; type: 'party' | 'lawyer'; name: string } | undefined,
    sideName: 'plaintiff' | 'defendant',
    client = false,
  ) => (doc ? [{ Party: doc._id, side: sideName, type: doc.type, name: doc.name, ...(client ? { client } : {}) }] : []);
  const status = () => (chance(0.08) ? 'suspended' : chance(0.05) ? 'canceled' : 'active');
  // Some services keep only the required fields, to show the "Não preenchido" list in the detail.
  const sparse = () => chance(0.25);

  const judicial = Array.from({ length: 40 }, () => {
    const courtType = pick(['labor', 'labor', 'civil', 'civil', 'federal'] as const);
    const court = pick(COURTS[courtType]);
    const phase = pick(PERICIA_PHASES);
    const thin = sparse();
    const plaintiffs = Array.from({ length: chance(0.25) ? int(2, 4) : 1 }, () => pick(people));
    const defendant = pick(companies);
    return {
      processNumber: `${digits(7)}-${digits(2)}.${int(2015, year)}.${court.segment}.${digits(4)}`,
      ...(chance(0.85) ? { serviceOrder: nextServiceOrder() } : {}),
      courtType,
      role: 'court_expert' as const,
      court: court.court,
      division: pick(court.divisions),
      ...(thin ? {} : { district: court.district }),
      subject: pick(SUBJECTS[courtType]),
      parties: [
        ...plaintiffs.flatMap((doc) => side(doc, 'plaintiff')),
        ...(thin ? [] : side(pick(lawyers), 'plaintiff')),
        ...side(defendant, 'defendant'),
        ...(thin ? [] : side(pick(lawyers), 'defendant')),
      ],
      phase,
      status: status(),
      nominationDate: day(-int(5, 400)),
      ...(thin ? {} : { proposedFeesCents: int(15, 120) * 10_000 }),
      ...(DELIVERED.includes(phase) || chance(0.4) ? { fixedFeesCents: int(15, 90) * 10_000 } : {}),
      ...(thin ? {} : { notes: 'Processo com documentos digitalizados na pasta do escritório.' }),
      ...(chance(0.3) ? { folderUrl: driveFolder() } : {}),
      ...(courtType === 'labor' && !thin
        ? {
            docketingDate: day(-int(120, 600)),
            hireDate: day(-int(1500, 4000)),
            terminationDate: day(-int(150, 700)),
            claimantJob: pick(['Operador(a) de máquinas', 'Frentista', 'Auxiliar de produção', 'Eletricista']),
            location: pick(STREETS),
          }
        : {}),
      movements: DELIVERED.includes(phase)
        ? [
            { type: 'report_filed' as const, date: day(-int(10, 120)) },
            ...(chance(0.4)
              ? [{ type: 'clarification_summons' as const, date: day(-int(1, 9)), notes: 'Quesitos complementares' }]
              : []),
          ]
        : [],
    };
  });

  const assistance = Array.from({ length: 14 }, () => {
    const courtType = pick(['labor', 'civil'] as const);
    const court = pick(COURTS[courtType]);
    const thin = sparse();
    const client = pick(companies);
    return {
      processNumber: `${digits(7)}-${digits(2)}.${int(2018, year)}.${court.segment}.${digits(4)}`,
      ...(chance(0.85) ? { serviceOrder: nextServiceOrder() } : {}),
      courtType,
      role: 'technical_assistant' as const,
      court: court.court,
      division: pick(court.divisions),
      subject: pick(SUBJECTS[courtType]),
      contractor: {
        name: `${client.name} - Reclamante ${pick(FIRST)}`,
        ...(thin
          ? {}
          : {
              document: digits(14),
              phone: `(51) 9${digits(4)}-${digits(4)}`,
              email: `juridico@${words(client.name).slice(0, 2).join('')}.com.br`,
              address: pick(STREETS),
            }),
      },
      parties: [...side(pick(people), 'plaintiff'), ...side(client, 'defendant', true)],
      phase: pick(TECHNICAL_ASSISTANCE_PHASES),
      status: status(),
      nominationDate: day(-int(5, 300)),
      ...(thin ? {} : { fixedFeesCents: int(20, 80) * 10_000 }),
    };
  });

  const own = Array.from({ length: 26 }, () => {
    const type = pick(OWN_TYPES);
    const thin = sparse();
    const contractor = chance(0.5) ? pick(companies).name : `${pick(FIRST)} ${pick(LAST)}`;
    const finished = chance(0.15);
    return {
      ...(chance(0.9) ? { serviceOrder: nextServiceOrder() } : {}),
      serviceType: type.serviceType,
      ...(chance(0.5)
        ? { role: 'other' as const, roleName: pick(['Vistoria Urbana', 'Avaliação', 'Consultoria técnica']) }
        : { role: 'court_expert' as const }),
      subject: pick(type.subjects),
      contractor: {
        name: contractor,
        ...(thin
          ? {}
          : {
              document: digits(chance(0.5) ? 11 : 14),
              phone: `(11) 9${digits(4)}-${digits(4)}`,
              email: mailbox(contractor),
              address: pick(STREETS),
            }),
      },
      parties: [],
      ...(finished ? { phase: 'fees_received' as const } : { phase: 'custom' as const, phaseName: pick(OWN_PHASES) }),
      status: status(),
      ...(thin ? {} : { nominationDate: day(-int(1, 200)) }),
      ...(thin ? {} : { fixedFeesCents: int(5, 60) * 10_000 }),
      ...(thin ? {} : { notes: 'Contato preferencial por WhatsApp.' }),
    };
  });

  const cases = await Case.insertMany(scoped([...judicial, ...assistance, ...own]));
  await ServiceOrderSequence.updateOne({ Tenant }, { $set: { year, last } });

  // Deadlines and alerts (AD-109, AD-190): overdue, due in the coming days and far away, some already filed.
  const deadlines = await Deadline.insertMany(
    cases.flatMap((legalCase) =>
      legalCase.status === 'canceled'
        ? []
        : Array.from({ length: int(0, 3) }, (_, index) => {
            const offset = int(-25, 60);
            const done = offset < 0 && chance(0.4);
            const alert = index > 0 && chance(0.3);
            return {
              Tenant,
              Case: legalCase._id,
              kind: alert ? ('alert' as const) : ('deadline' as const),
              title: alert
                ? pick(ALERT_TITLES)
                : index === 0
                  ? legalCase.serviceType
                    ? 'Entrega do serviço'
                    : 'Entrega do laudo'
                  : pick(DEADLINE_TITLES),
              dueDate: day(offset),
              status: done ? (alert ? ('done' as const) : ('filed' as const)) : ('pending' as const),
              ...(done && !alert ? { filedDate: day(offset - 1) } : {}),
            };
          }),
    ),
  );

  // Agenda: inspections at real addresses (map and route), hearings and meetings, from a month ago to a month ahead.
  const TYPES = ['inspection', 'inspection', 'inspection', 'hearing', 'meeting', 'other'] as const;
  await Appointment.insertMany(
    Array.from({ length: 70 }, (_, index) => {
      const type = pick(TYPES);
      // A few on today for the field route (CAM-01).
      const offset = index < 4 ? 0 : int(-30, 35);
      const hour = int(8, 16);
      const legalCase = chance(0.85) ? pick(cases) : undefined;
      return {
        Tenant,
        type,
        title:
          type === 'inspection'
            ? pick([
                'Vistoria na fábrica',
                'Vistoria no imóvel',
                'Vistoria no posto',
                'Vistoria no condomínio',
                'Vistoria no almoxarifado',
              ])
            : type === 'hearing'
              ? 'Audiência de esclarecimentos'
              : type === 'meeting'
                ? 'Reunião com assistente técnico'
                : 'Entrega de documentos no fórum',
        start: at(offset, `${String(hour).padStart(2, '0')}:00`),
        end: at(offset, `${String(hour + 1).padStart(2, '0')}:30`),
        ...(type === 'meeting' ? {} : { location: pick(STREETS) }),
        ...(legalCase ? { Case: legalCase._id } : {}),
        status: offset < 0 ? (chance(0.85) ? ('done' as const) : ('canceled' as const)) : ('scheduled' as const),
      };
    }),
  );

  // Twelve months of transactions: fees received and expected (with partial receipts) and expenses by category.
  const transactions = [];
  for (let month = 11; month >= -2; month -= 1) {
    const base = -month * 30;
    for (let item = 0; item < int(3, 6); item += 1) {
      const legalCase = pick(cases);
      const amount = int(8, 60) * 10_000;
      const dueDate = day(base - int(0, 25));
      const past = base < 0;
      const partial = past && chance(0.15);
      const settled = past && !partial && chance(0.75);
      transactions.push({
        kind: 'income' as const,
        category: pick(['advance_fees', 'fixed_fees', 'contracted_fees'] as const),
        description: `Honorários — ${legalCase.processNumber ?? legalCase.subject}`,
        amountCents: amount,
        dueDate,
        status: settled ? ('settled' as const) : partial ? ('partial' as const) : ('expected' as const),
        ...(settled
          ? {
              installments: [
                { amountCents: amount, date: dueDate, account: pick(['Banco do Brasil', 'Itaú', 'Caixa']) },
              ],
            }
          : {}),
        ...(partial
          ? { installments: [{ amountCents: Math.round(amount / 2), date: dueDate, account: 'Banco do Brasil' }] }
          : {}),
        Case: legalCase._id,
      });
    }
    for (let item = 0; item < int(2, 5); item += 1) {
      const category = pick([
        'travel',
        'equipment',
        'third_parties',
        'supplies',
        'fees_and_taxes',
        'food',
        'other_expenses',
      ] as const);
      const dueDate = day(base - int(0, 25));
      const settled = base < 0 && chance(0.85);
      transactions.push({
        kind: 'expense' as const,
        category,
        ...(category === 'other_expenses' ? { categoryName: pick(['Combustível', 'Software', 'Impressões']) } : {}),
        description: {
          travel: 'Deslocamento para vistoria',
          equipment: 'Calibração do decibelímetro',
          third_parties: 'Topógrafo terceirizado',
          supplies: 'Material de escritório',
          fees_and_taxes: 'Anuidade do conselho',
          food: 'Alimentação em diligência',
          other_expenses: 'Despesa do escritório',
        }[category],
        amountCents: int(30, 900) * 100,
        dueDate,
        status: settled ? ('settled' as const) : ('expected' as const),
        ...(settled ? { settledDate: dueDate } : {}),
        ...(chance(0.6) ? { Case: pick(cases)._id } : {}),
      });
    }
  }
  const created = await Transaction.insertMany(scoped(transactions));

  // Agenda entries of the deadlines and transactions, as the events would send them (AD-169).
  await CalendarEntry.insertMany([
    ...deadlines.flatMap((deadline) =>
      deadlineAgendaEntries(deadline).map((entry) => ({
        ...entry,
        Tenant,
        source: 'deadline' as const,
        originId: deadline._id.toString(),
        Case: deadline.Case,
      })),
    ),
    ...created.flatMap((transaction) =>
      transactionAgendaEntries(transaction).map((entry) => ({
        ...entry,
        Tenant,
        source: 'transaction' as const,
        originId: transaction._id.toString(),
        Case: transaction.Case,
      })),
    ),
  ]);

  // Prospecting opportunities in every status.
  await Opportunity.insertMany(
    scoped(
      Array.from({ length: 24 }, () => ({
        processNumber: `${digits(7)}-${digits(2)}.${year}.5.02.${digits(4)}`,
        court: pick(['trt2', 'trt15', 'trt4'] as const),
        caseClass: pick(['Ação Trabalhista - Rito Ordinário', 'Ação Trabalhista - Rito Sumaríssimo']),
        subjects: [pick(['Adicional de Insalubridade', 'Adicional de Periculosidade', 'Doença Ocupacional'])],
        courtUnit: pick(COURTS.labor[0]?.divisions ?? []),
        filingDate: day(-int(10, 200)),
        lastMovement: pick(['Determinada a realização de perícia', 'Nomeado perito', 'Conclusos para despacho']),
        lastMovementAt: day(-int(0, 30)),
        status: pick(['new', 'new', 'under_review', 'discarded'] as const),
      })),
    ),
  );

  // Draft reports of cases being drafted, from the default template (AD-126).
  const template = DEFAULT_TEMPLATES.find((item) => item.id === 'standard-report') as TemplateRecord;
  const drafting = cases
    .filter(
      (legalCase) =>
        legalCase.processNumber &&
        ['drafting_report', 'reviewing_report', 'report_delivered'].includes(legalCase.phase),
    )
    .slice(0, 8);
  await Report.insertMany(
    drafting.map((legalCase, index) => {
      const values = {
        '[NUMERO_PROCESSO]': legalCase.processNumber ?? '',
        '[TRIBUNAL]': legalCase.court ?? '',
        '[VARA]': legalCase.division ?? '',
        '[OBJETO]': legalCase.subject,
        '[NOME_AUTOR]': legalCase.parties.find((party) => party.side === 'plaintiff')?.name ?? '',
        '[NOME_REU]': legalCase.parties.find((party) => party.side === 'defendant')?.name ?? '',
        '[PERITO_NOME]': owner.name,
      };
      return {
        Tenant,
        Case: legalCase._id,
        type: 'report' as const,
        status: index % 3 === 2 ? ('completed' as const) : ('draft' as const),
        title: 'Laudo pericial',
        templateId: template.id,
        templateName: template.name,
        CreatedBy: owner._id,
        sections: template.sections.slice(0, 8).map((section) => ({
          templateSectionId: section.id,
          title: resolveVariables(section.title, values, 'text'),
          level: section.level,
          titleOnly: section.titleOnly,
          pageBreak: section.pageBreak,
          variant: 'yes' as const,
          html: resolveVariables(section.yesText, values, 'html'),
        })),
      };
    }),
  );

  console.log(
    JSON.stringify({
      event: 'seed.volume.done',
      tenant: Tenant.toString(),
      cases: cases.length,
      parties: people.length + companies.length + lawyers.length,
      deadlines: deadlines.length,
      transactions: created.length,
      reports: drafting.length,
    }),
  );
  await disconnect();
};

void run();
