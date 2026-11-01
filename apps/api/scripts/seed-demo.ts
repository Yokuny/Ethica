import { PERFIL_PERMISSOES } from '@ethica/contracts';
import type { CompromissoDocument, LancamentoDocument, ParcelaDocument } from '@ethica/db';
import {
  Atividade,
  Case,
  Compromisso,
  connect,
  Deadline,
  dateInDisplayTz,
  disconnect,
  Lancamento,
  Laudo,
  ModeloLaudo,
  Oportunidade,
  Party,
  Session,
  Tenant,
  User,
  Vistoria,
  wallClockToUtc,
} from '@ethica/db';
import bcrypt from 'bcrypt';
import { env } from '../src/config/env.config.js';
import { MODELOS_PADRAO } from '../src/modules/documentos/laudo.biblioteca.js';
import { resolveVariables } from '../src/modules/documentos/laudo.html.js';

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

const CASES = [
  {
    numero: '0001234-56.2026.5.02.0001',
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
    numero: '0002345-67.2026.5.02.0011',
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
    numero: '0003456-78.2025.8.26.0100',
    courtType: 'civil',
    court: 'TJSP',
    division: '5ª Vara Cível do Foro Central',
    subject: 'Vícios construtivos em edifício',
    status: 'appointed',
    deadline: 30,
    proposed: 900_000,
    // Assistente técnico contratado pela autora (AD-135): honorário contratado.
    fixed: 600_000,
  },
  {
    numero: '0004567-89.2025.4.03.6100',
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
    numero: '0005678-90.2025.5.15.0032',
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
    numero: '0006789-01.2024.8.26.0224',
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
      Atividade.deleteMany({ Tenant: old._id }),
      Case.deleteMany({ Tenant: old._id }),
      Party.deleteMany({ Tenant: old._id }),
      Deadline.deleteMany({ Tenant: old._id }),
      Compromisso.deleteMany({ Tenant: old._id }),
      Vistoria.deleteMany({ Tenant: old._id }),
      Lancamento.deleteMany({ Tenant: old._id }),
      Oportunidade.deleteMany({ Tenant: old._id }),
      Laudo.deleteMany({ Tenant: old._id }),
      ModeloLaudo.deleteMany({ Tenant: old._id }),
      Session.deleteMany({ user: { $in: users.map((user) => user._id) } }),
      User.deleteMany({ Tenant: old._id }),
      Tenant.deleteOne({ _id: old._id }),
    ]);
  }

  // Identidade dos documentos (AD-121); o logo depende do storage e fica para a tela do escritório.
  const tenant = await Tenant.create({
    name: 'Perícias Demo',
    document: DOCUMENT,
    status: 'active',
    cabecalho: '[LOGO]\nPerícias Demo — Engenharia de Segurança do Trabalho\nRua das Perícias, 100 — São Paulo/SP',
    rodape: '[NOME_PERITO] · Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]',
  });
  const password = await bcrypt.hash(PASSWORD, 10);
  const [admin] = await User.create(
    (['admin', 'manager', 'operator'] as const).map((role) => ({
      name: `${role[0]?.toUpperCase()}${role.slice(1)} Demo`,
      email: `${role}@pericias.example.com`,
      password,
      Tenant: tenant._id,
      role: [role],
      // Matriz de permissões (AD-137): gestor e operador com o preset do perfil; admin tem tudo.
      ...(role === 'admin' ? {} : { permissoes: PERFIL_PERMISSOES[role] }),
      // Dados profissionais dos documentos (DOC-01).
      ...(role === 'admin'
        ? {
            cpf: '52998224725',
            registroProfissional: 'CREA-SP 5061234567',
            formacao: 'Engenharia de Segurança do Trabalho',
          }
        : {}),
    })),
  );

  // Partes e advogados reutilizáveis (AD-117): a mesma ré e os mesmos advogados em vários processos.
  const [maria, jose, aurora, industria, construtora, inss, joao, ana] = await Party.insertMany(
    [
      { tipo: 'party', nome: 'Maria da Silva', documento: '12345678909', telefone: '(11) 98888-1000' },
      { tipo: 'party', nome: 'José Santos', documento: '98765432100' },
      { tipo: 'party', nome: 'Condomínio Edifício Aurora', documento: '11222333000181' },
      { tipo: 'party', nome: 'Indústria Exemplo Ltda.', documento: '12345678000195', email: 'juridico@exemplo.com' },
      { tipo: 'party', nome: 'Construtora Alfa S.A.', documento: '33444555000172' },
      { tipo: 'party', nome: 'Instituto Nacional do Seguro Social' },
      { tipo: 'lawyer', nome: 'João Pereira', oab: 'SP123456', email: 'joao@advocacia.com' },
      { tipo: 'lawyer', nome: 'Ana Souza', oab: 'SP654321' },
    ].map((party) => ({ ...party, Tenant: tenant._id })),
  );
  const party = (doc: typeof maria, side: 'plaintiff' | 'defendant') =>
    doc ? [{ Party: doc._id, side, tipo: doc.tipo, nome: doc.nome }] : [];
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
      processNumber: p.numero,
      courtType: p.courtType,
      role: index === 2 ? 'technical_assistant' : 'court_expert',
      court: p.court,
      division: p.division,
      district: p.court === 'TRT15' ? 'Campinas' : 'São Paulo',
      subject: p.subject,
      parties: [
        // Na perícia de assistente técnico (índice 2), a autora é quem contratou (AD-135).
        ...party(PARTIES[index]?.[0], 'plaintiff').map((item) => (index === 2 ? { ...item, client: true } : item)),
        ...party(joao, 'plaintiff'),
        ...party(PARTIES[index]?.[1], 'defendant'),
        ...party(ana, 'defendant'),
      ],
      // Dados auxiliares do laudo trabalhista (IMP-04).
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
      // A cível (índice 2) foi nomeada há 95 dias e nunca se moveu: aparece em perícias paradas.
      nominationDate: index === 2 ? day(-95) : day(-40 + index * 3),
      // Movimentações (AD-121): laudo entregue há 70 dias (parada) e intimação recente (ativa).
      movements:
        p.status === 'report_delivered'
          ? [{ tipo: 'report_filed', data: day(-70) }]
          : p.status === 'clarifications'
            ? [
                { tipo: 'report_filed', data: day(-30) },
                { tipo: 'clarification_summons', data: day(-8), observacoes: 'Quesitos complementares da reclamada' },
              ]
            : [],
      proposedFeesCents: p.proposed,
      fixedFeesCents: 'fixed' in p ? p.fixed : undefined,
    })),
  );
  const [vistoria, laudo, civel, federal, clarifications] = cases;

  // Prazos (AD-109): a entrega do laudo de cada perícia, protocolada nas que já entregaram,
  // e um prazo de esclarecimentos já protocolado para mostrar o histórico.
  await Deadline.insertMany([
    ...CASES.flatMap((p, index) => {
      const legalCase = cases[index];
      if (!('deadline' in p) || !legalCase) return [];
      const entregue = ['report_delivered', 'completed'].includes(p.status);
      return [
        {
          Tenant: tenant._id,
          Case: legalCase._id,
          titulo: 'Entrega do laudo',
          vencimento: day(p.deadline),
          status: entregue ? ('filed' as const) : ('pending' as const),
          filedDate: entregue ? day(p.deadline - 1) : undefined,
        },
      ];
    }),
    {
      Tenant: tenant._id,
      Case: clarifications?._id,
      titulo: 'Resposta à impugnação',
      vencimento: day(10),
      status: 'pending' as const,
    },
  ]);

  const compromissos: Partial<CompromissoDocument>[] = [
    // Rota de campo de hoje (CAM-01): duas vistorias em endereços reais para o mapa.
    {
      tipo: 'inspection',
      titulo: 'Vistoria na estamparia',
      inicio: at(0, '09:00'),
      fim: at(0, '11:00'),
      local: 'Avenida Paulista, 1578, São Paulo, SP',
      Case: vistoria?._id,
    },
    {
      tipo: 'inspection',
      titulo: 'Vistoria no almoxarifado',
      inicio: at(0, '14:00'),
      fim: at(0, '15:30'),
      local: 'Rua Vergueiro, 1000, São Paulo, SP',
      Case: clarifications?._id,
    },
    {
      tipo: 'inspection',
      titulo: 'Vistoria na linha de prensas',
      inicio: at(1, '09:00'),
      fim: at(1, '11:00'),
      local: 'Av. Industrial, 1500 — São Paulo',
      Case: vistoria?._id,
    },
    {
      tipo: 'hearing',
      titulo: 'Audiência de esclarecimentos',
      inicio: at(4, '14:00'),
      fim: at(4, '15:00'),
      local: 'Fórum Trabalhista de Campinas',
      Case: clarifications?._id,
    },
    {
      tipo: 'meeting',
      titulo: 'Reunião com assistente técnico',
      inicio: at(6, '10:00'),
      fim: at(6, '11:00'),
      Case: civel?._id,
    },
    {
      tipo: 'inspection',
      titulo: 'Vistoria no edifício',
      inicio: at(9, '08:30'),
      fim: at(9, '12:00'),
      local: 'Rua das Flores, 100',
      Case: civel?._id,
    },
    {
      tipo: 'inspection',
      titulo: 'Vistoria no posto de combustível',
      inicio: at(-6, '09:00'),
      fim: at(-6, '10:30'),
      Case: laudo?._id,
      status: 'done',
    },
  ];
  const criados = await Compromisso.insertMany(
    compromissos.map((compromisso) => ({ ...compromisso, Tenant: tenant._id })),
  );

  // Registro da vistoria já feita (AD-130): alimenta as variáveis de campo do laudo em rascunho.
  const feita = criados.find((compromisso) => compromisso.status === 'done');
  await Vistoria.create({
    Tenant: tenant._id,
    Compromisso: feita?._id,
    Case: laudo?._id,
    versao: 1,
    dados: {
      presentes: [
        { id: 'p1', nome: 'José Santos', qualidade: 'plaintiff' },
        { id: 'p2', nome: 'João Pereira', qualidade: 'plaintiff_lawyer', email: 'joao@advocacia.com' },
        { id: 'p3', nome: 'Carlos Lima (encarregado)', qualidade: 'defendant' },
      ],
      paradigmas: [{ id: 'g1', side: 'plaintiff', nome: 'Pedro Alves', funcao: 'Frentista', trabalhouJunto: true }],
      funcoes: [
        {
          id: 'f1',
          titulo: 'Frentista',
          anoInicio: 2017,
          anoFim: 2026,
          local: 'Pista de abastecimento',
          plaintiff: {
            atividades: 'Abastecia veículos e conferia bombas',
            frequencia: 'diária',
            timeExposure: '8h/dia',
          },
          defendant: { atividades: 'Abastecia veículos', frequencia: 'diária', timeExposure: '6h/dia' },
        },
      ],
      agentes: [
        { agente: 'hazardous', presente: 'yes', observacoes: 'área de risco das bombas' },
        { agente: 'noise', presente: 'no' },
      ],
      documentos: [
        { id: 'd1', documento: 'risk_program', solicitado: true },
        { id: 'd2', documento: 'ppe_records', solicitado: true },
      ],
      observacoes: 'Encarregado confirmou a rotina na pista.',
    },
    midias: [],
  });

  // Seis meses de movimento para o fluxo de caixa.
  const lancamentos: Partial<LancamentoDocument>[] = [];
  for (let month = 5; month >= 0; month -= 1) {
    const offset = -month * 30;
    lancamentos.push(
      {
        natureza: 'income',
        categoria: 'advance_fees',
        descricao: 'Honorários prévios',
        valorCents: 150_000 + month * 20_000,
        vencimento: day(offset - 10),
        status: 'settled',
        parcelas: [{ valorCents: 150_000 + month * 20_000, data: day(offset - 8) } as ParcelaDocument],
      },
      {
        natureza: 'expense',
        categoria: 'travel',
        descricao: 'Deslocamento para vistoria',
        valorCents: 18_000 + month * 1_500,
        vencimento: day(offset - 5),
        status: 'settled',
        liquidadoEm: day(offset - 5),
      },
    );
  }
  lancamentos.push(
    {
      natureza: 'income',
      categoria: 'fixed_fees',
      descricao: `Honorários fixados — ${laudo?.processNumber}`,
      valorCents: 350_000,
      vencimento: day(20),
      status: 'expected',
      Case: laudo?._id,
    },
    {
      natureza: 'income',
      categoria: 'contracted_fees',
      descricao: `Honorários contratados — ${civel?.processNumber}`,
      valorCents: 600_000,
      vencimento: day(25),
      status: 'expected',
      Case: civel?._id,
    },
    {
      natureza: 'income',
      categoria: 'fixed_fees',
      descricao: `Honorários fixados — ${federal?.processNumber}`,
      valorCents: 300_000,
      vencimento: day(-12),
      status: 'expected',
      Case: federal?._id,
    },
    {
      natureza: 'income',
      categoria: 'fixed_fees',
      descricao: `Honorários fixados — ${clarifications?.processNumber}`,
      valorCents: 480_000,
      vencimento: day(-20),
      // Recebimento parcial (AD-111): alvará de R$ 1.500,00, saldo de R$ 3.300,00.
      status: 'partial',
      parcelas: [{ valorCents: 150_000, data: day(-18), conta: 'Banco do Brasil' } as ParcelaDocument],
      Case: clarifications?._id,
    },
    {
      natureza: 'expense',
      categoria: 'supplies',
      descricao: 'Decibelímetro — calibração',
      valorCents: 45_000,
      vencimento: day(7),
      status: 'expected',
    },
    {
      natureza: 'expense',
      categoria: 'fees_and_taxes',
      descricao: 'Anuidade do conselho',
      valorCents: 62_000,
      vencimento: day(15),
      status: 'expected',
    },
  );
  await Lancamento.insertMany(lancamentos.map((lancamento) => ({ ...lancamento, Tenant: tenant._id })));

  // Laudos (AD-126): um modelo do escritório clonado do padrão e um laudo em rascunho da perícia
  // em elaboração, com as seções de periculosidade e uma variável pendente para mostrar o bloqueio.
  const padrao = MODELOS_PADRAO.report;
  await ModeloLaudo.create({
    Tenant: tenant._id,
    nome: 'Periculosidade — inflamáveis (escritório)',
    tipo: 'report',
    secoes: padrao.secoes
      .filter((secao) => !secao.titulo.includes('NR-15') && !/^Anexo \d+ — (?!Inflamáveis)/.test(secao.titulo))
      .map(({ id: _id, ...secao }) => secao),
  });
  const valores = {
    '[NUMERO_PROCESSO]': CASES[1].numero,
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
  const ESCOLHA: Record<string, 'yes' | 'no'> = {
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
  await Laudo.create({
    Tenant: tenant._id,
    Case: laudo?._id,
    tipo: 'report',
    status: 'draft',
    titulo: 'Laudo pericial',
    modeloNome: padrao.nome,
    CriadoPor: admin?._id,
    secoes: padrao.secoes
      .filter((secao) => secao.titulo in ESCOLHA)
      .map((secao) => {
        const variante = ESCOLHA[secao.titulo] ?? 'yes';
        return {
          titulo: resolveVariables(secao.titulo, valores, 'texto'),
          nivel: secao.nivel,
          apenasTitulo: secao.apenasTitulo,
          quebraPagina: secao.quebraPagina,
          variante,
          html: resolveVariables(variante === 'yes' ? secao.textoSim : secao.textoNao, valores, 'html'),
        };
      }),
  });

  await Oportunidade.create([
    {
      Tenant: tenant._id,
      processNumber: '0007890-12.2026.5.02.0045',
      court: 'trt2',
      classe: 'Ação Trabalhista - Rito Ordinário',
      assuntos: ['Adicional de Insalubridade'],
      orgaoJulgador: '45ª Vara do Trabalho de São Paulo',
      lastMovement: 'Determinada a realização de perícia',
      status: 'new',
    },
    {
      Tenant: tenant._id,
      processNumber: '0008901-23.2026.5.15.0001',
      court: 'trt15',
      classe: 'Ação Trabalhista - Rito Sumaríssimo',
      assuntos: ['Doença Ocupacional'],
      orgaoJulgador: '1ª Vara do Trabalho de Campinas',
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
