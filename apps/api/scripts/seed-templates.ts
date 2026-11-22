import { REPORT_LAYOUT_DEFAULT, type ReportLayout, type ReportType } from '@ethica/contracts';
import { connect, disconnect, Template, User } from '@ethica/db';
import { env } from '../src/config/env.config.js';
import { DEFAULT_TEMPLATES } from '../src/modules/documents/report.library.js';

// Dev tool: fills the office library of an existing login with templates of every area (the four spheres, the
// office's own service types and none) and both types, for visual checks. It only adds: nothing is deleted.
//
//   pnpm --filter api run seed:templates <login e-mail>
const email = process.argv[2];

type Section = { title: string; level?: number; titleOnly?: boolean; pageBreak?: boolean; yes?: string; no?: string };
type Seed = {
  name: string;
  details?: string;
  area?: string;
  type: ReportType;
  layout?: Partial<ReportLayout>;
  sections: Section[];
};

const p = (...paragraphs: string[]): string => paragraphs.map((text) => `<p>${text}</p>`).join('');

const IDENTIFICATION: Section = {
  title: 'Identificação do processo',
  yes: p(
    'Processo nº [NUMERO_PROCESSO], em trâmite na [VARA] ([TRIBUNAL]).',
    '[DENOMINACAO_AUTOR]: [NOME_AUTOR]',
    '[DENOMINACAO_REU]: [NOME_REU]',
    'Objeto: [OBJETO].',
  ),
};
const INSPECTION: Section = {
  title: 'Diligência pericial',
  yes: p(
    'A vistoria foi realizada em [DATA_VISTORIA], às [HORA_VISTORIA], no endereço [LOCAL_PERICIA], com a presença de [PRESENTES_VISTORIA].',
    'Foram percorridos os setores indicados na inicial e entrevistados os presentes sobre a rotina de trabalho do período imprescrito ([PERIODO_IMPRESCRITO]).',
  ),
  no: p(
    'A vistoria designada para [DATA_VISTORIA] não pôde ser realizada no local, que se encontra desativado; a análise baseou-se nos documentos dos autos.',
  ),
};
const CLOSING: Section = {
  title: 'Encerramento',
  yes: p(
    'Nada mais havendo a esclarecer, encerra-se o presente laudo, composto por páginas numeradas e anexos, colocando-se o signatário à disposição do Juízo.',
    '[COMARCA], [DATA_EXTENSO].',
    '[PERITO_NOME]<br />[PERITO_FORMACAO] — [PERITO_REGISTRO]',
  ),
};
const OPINION_CLOSING: Section = {
  title: 'Encerramento',
  yes: p(
    'São estas as considerações técnicas que se submetem à apreciação de Vossa Excelência, requerendo-se a juntada do presente parecer aos autos.',
    '[COMARCA], [DATA_EXTENSO].',
    '[PERITO_NOME]<br />Assistente técnico — [PERITO_REGISTRO]',
  ),
};
const answers = (who: string): Section => ({
  title: `Quesitos ${who}`,
  level: 2,
  yes: p(
    '1) Resposta: Sim, conforme item de avaliação deste laudo.',
    '2) Resposta: Prejudicado, em face da resposta anterior.',
  ),
});

const TEMPLATES: Seed[] = [
  {
    name: 'Insalubridade por ruído',
    details: 'Linha de produção com prensas e dosimetria de jornada completa',
    area: 'labor',
    type: 'report',
    sections: [
      IDENTIFICATION,
      {
        title: 'Objetivo',
        yes: p(
          'Verificar a exposição do(a) [DENOMINACAO_AUTOR] a ruído contínuo ou intermitente acima do limite de tolerância do Anexo 1 da NR-15.',
        ),
      },
      {
        title: 'Dados do contrato',
        yes: p('Admissão: [DATA_ADMISSAO]. Demissão: [DATA_DEMISSAO]. Função: [FUNCAO_RECLAMANTE].'),
      },
      INSPECTION,
      { title: 'Metodologia', titleOnly: true },
      {
        title: 'Instrumental utilizado',
        level: 2,
        yes: p(
          'Dosímetro de ruído classe 2, calibrado antes e depois das medições, com certificado de calibração anexo (Anexo III).',
        ),
      },
      {
        title: 'Critério de avaliação',
        level: 2,
        yes: p(
          'Avaliação conforme NHO 01 da Fundacentro, com fator de duplicação q = 5 para comparação com o Anexo 1 da NR-15.',
        ),
      },
      {
        title: 'Avaliação do ruído',
        yes: p(
          'O nível de exposição normalizado (NEN) apurado foi de 91,4 dB(A), superior ao limite de 85 dB(A) para jornada de 8 horas.',
        ),
        no: p(
          'O nível de exposição normalizado (NEN) apurado foi de 82,1 dB(A), inferior ao limite de 85 dB(A) para jornada de 8 horas.',
        ),
      },
      {
        title: 'Equipamentos de proteção individual',
        yes: p(
          'As fichas de entrega de EPI não comprovam o fornecimento regular de protetor auricular com CA válido durante todo o período.',
        ),
        no: p(
          'As fichas de entrega comprovam o fornecimento de protetor auricular tipo plug com CA válido, com substituição periódica e treinamento.',
        ),
      },
      { title: 'Respostas aos quesitos', titleOnly: true, pageBreak: true },
      answers('do(a) reclamante'),
      answers('da reclamada'),
      answers('do Juízo'),
      {
        title: 'Conclusão',
        yes: p(
          'Caracteriza-se a insalubridade em grau médio (20%), nos termos do Anexo 1 da NR-15, durante todo o período imprescrito.',
        ),
        no: p('Não se caracteriza a insalubridade por ruído, nos termos do Anexo 1 da NR-15.'),
      },
      CLOSING,
    ],
  },
  {
    name: 'Periculosidade por eletricidade',
    details: 'Eletricistas de manutenção em subestação e rede de distribuição',
    area: 'labor',
    type: 'report',
    layout: { font: 'arial', fontSize: 11 },
    sections: [
      IDENTIFICATION,
      {
        title: 'Atividades do(a) reclamante',
        yes: p(
          'O(a) [DENOMINACAO_AUTOR] exercia a função de [FUNCAO_RECLAMANTE], com manobras em painéis e cubículos energizados.',
        ),
      },
      INSPECTION,
      {
        title: 'Enquadramento legal',
        yes: p(
          'Anexo 4 da NR-16 (Portaria MTE nº 1.078/2014) e item 10.2 da NR-10, quanto às atividades em sistema elétrico de potência e em suas proximidades.',
        ),
      },
      {
        title: 'Análise da exposição',
        yes: p(
          'Constatou-se a realização habitual de intervenções na zona controlada de equipamentos energizados em 13,8 kV, sem desenergização prévia.',
        ),
        no: p(
          'As intervenções eram feitas com o circuito desenergizado, bloqueado e etiquetado, conforme os procedimentos de trabalho apresentados.',
        ),
      },
      { title: 'Respostas aos quesitos', titleOnly: true, pageBreak: true },
      answers('do(a) reclamante'),
      answers('da reclamada'),
      {
        title: 'Conclusão',
        yes: p('Caracteriza-se a periculosidade (30%), nos termos do Anexo 4 da NR-16.'),
        no: p('Não se caracteriza a periculosidade, nos termos do Anexo 4 da NR-16.'),
      },
      CLOSING,
    ],
  },
  {
    name: 'Doença ocupacional — LER/DORT',
    details: 'Nexo causal e análise ergonômica do posto de trabalho',
    area: 'labor',
    type: 'report',
    sections: [
      IDENTIFICATION,
      {
        title: 'Histórico ocupacional',
        yes: p(
          'Admissão em [DATA_ADMISSAO] na função de [FUNCAO_RECLAMANTE], com jornada de 44 horas semanais e revezamento de turnos.',
        ),
      },
      INSPECTION,
      {
        title: 'Análise ergonômica do posto',
        yes: p(
          'O posto exigia movimentos repetitivos de membros superiores com frequência superior a 30 ciclos por minuto, sem pausas previstas na NR-17.',
        ),
        no: p(
          'O posto apresentava rodízio de tarefas, pausas regulares e mobiliário regulável, em conformidade com a NR-17.',
        ),
      },
      {
        title: 'Documentação médica',
        yes: p('Foram analisados os exames ocupacionais, atestados e laudos de imagem juntados aos autos.'),
      },
      {
        title: 'Nexo causal',
        yes: p('Há nexo causal entre a patologia diagnosticada e as atividades exercidas na reclamada.'),
        no: p('Não há nexo causal entre a patologia diagnosticada e as atividades exercidas na reclamada.'),
      },
      { title: 'Respostas aos quesitos', titleOnly: true, pageBreak: true },
      answers('do(a) reclamante'),
      answers('da reclamada'),
      CLOSING,
    ],
  },
  {
    name: 'Vícios construtivos em edificação',
    details: 'Edifício residencial multifamiliar — fachada, impermeabilização e estrutura',
    area: 'civil',
    type: 'report',
    layout: { font: 'times', lineHeight: 1.5, titleColor: '#3a2a1b' },
    sections: [
      IDENTIFICATION,
      {
        title: 'Objetivo',
        yes: p(
          'Apurar a existência, a origem e a extensão das anomalias apontadas na inicial, bem como o custo de reparo.',
        ),
      },
      INSPECTION,
      {
        title: 'Descrição do imóvel',
        yes: p(
          'Edifício com 12 pavimentos, estrutura em concreto armado, vedação em blocos cerâmicos e fachada com revestimento cerâmico, com habite-se emitido há menos de cinco anos.',
        ),
      },
      { title: 'Anomalias constatadas', titleOnly: true },
      {
        title: 'Fachada',
        level: 2,
        yes: p(
          'Destacamento de placas cerâmicas nas fachadas norte e oeste, com som cavo em cerca de 18% da área percussionada.',
        ),
      },
      {
        title: 'Impermeabilização',
        level: 2,
        yes: p(
          'Infiltração na laje de cobertura e nas jardineiras do térreo, com eflorescência e manchas de umidade nos tetos.',
        ),
      },
      {
        title: 'Estrutura',
        level: 2,
        yes: p(
          'Fissuras inclinadas em vigas do subsolo, com abertura inferior a 0,3 mm, sem indícios de comprometimento estrutural.',
        ),
      },
      {
        title: 'Origem das anomalias',
        yes: p(
          'As anomalias têm origem endógena, decorrente de falhas de execução e de especificação, em desacordo com a NBR 13755 e a NBR 9575.',
        ),
        no: p(
          'As anomalias decorrem de falta de manutenção pelo condomínio, em desacordo com o manual de uso e a NBR 5674.',
        ),
      },
      {
        title: 'Orçamento dos reparos',
        yes: p('O custo estimado dos reparos, com base na tabela SINAPI vigente, é apresentado no Anexo II.'),
      },
      { title: 'Respostas aos quesitos', titleOnly: true, pageBreak: true },
      answers('da parte autora'),
      answers('da parte ré'),
      CLOSING,
    ],
  },
  {
    name: 'Avaliação de imóvel urbano',
    details: 'Método comparativo direto de dados de mercado — NBR 14653-2',
    area: 'civil',
    type: 'report',
    sections: [
      IDENTIFICATION,
      { title: 'Objetivo', yes: p('Determinar o valor de mercado do imóvel objeto da lide, para fins de partilha.') },
      INSPECTION,
      {
        title: 'Caracterização da região',
        yes: p(
          'Região predominantemente residencial, com infraestrutura completa, transporte público e comércio de bairro a menos de 500 m.',
        ),
      },
      {
        title: 'Caracterização do imóvel',
        yes: p(
          'Apartamento com 78 m² de área privativa, três dormitórios, uma vaga de garagem, em edifício com 22 anos de idade aparente.',
        ),
      },
      {
        title: 'Metodologia',
        yes: p(
          'Método comparativo direto de dados de mercado, com tratamento por inferência estatística, grau de fundamentação II e grau de precisão III.',
        ),
      },
      {
        title: 'Pesquisa de mercado',
        yes: p(
          'Foram coletados 24 elementos comparativos de oferta e transação na mesma região, relacionados no Anexo I.',
        ),
      },
      { title: 'Valor de mercado', yes: p('Valor de mercado do imóvel: R$ (valor), na data-base de [DATA_VISTORIA].') },
      { title: 'Respostas aos quesitos', titleOnly: true, pageBreak: true },
      answers('da parte autora'),
      answers('da parte ré'),
      CLOSING,
    ],
  },
  {
    name: 'Infiltração em unidade condominial',
    area: 'civil',
    type: 'report',
    sections: [
      IDENTIFICATION,
      INSPECTION,
      {
        title: 'Constatações',
        yes: p(
          'Manchas de umidade e bolor no teto do banheiro social, coincidentes com o ralo e o box da unidade superior.',
        ),
      },
      {
        title: 'Origem da infiltração',
        yes: p(
          'O ensaio com corante confirmou vazamento no ralo da unidade superior, sem estanqueidade da impermeabilização do box.',
        ),
        no: p(
          'O ensaio com corante não confirmou vazamento na unidade superior; a umidade decorre de condensação por falta de ventilação.',
        ),
      },
      {
        title: 'Reparos necessários',
        yes: p(
          'Refazimento da impermeabilização do box da unidade superior e recuperação do forro e da pintura da unidade inferior.',
        ),
      },
      answers('das partes'),
      CLOSING,
    ],
  },
  {
    name: 'Aposentadoria especial — ruído',
    details: 'Períodos anteriores e posteriores a 2003 (NHO 01 e Decreto 4.882/2003)',
    area: 'federal',
    type: 'report',
    sections: [
      IDENTIFICATION,
      {
        title: 'Objetivo',
        yes: p(
          'Verificar a exposição do segurado a ruído acima dos limites vigentes em cada período, para fins de reconhecimento de tempo especial.',
        ),
      },
      {
        title: 'Períodos controvertidos',
        yes: p(
          'Os períodos e empregadores controvertidos estão relacionados na tabela a seguir, conforme a inicial e o PPP juntado.',
        ),
      },
      INSPECTION,
      {
        title: 'Limites de tolerância por período',
        yes: p(
          '80 dB(A) até 05/03/1997; 90 dB(A) de 06/03/1997 a 18/11/2003; 85 dB(A) a partir de 19/11/2003, com metodologia da NHO 01.',
        ),
      },
      {
        title: 'Análise',
        yes: p('Os níveis apurados superam o limite vigente em todos os períodos analisados.'),
        no: p('Os níveis apurados não superam o limite vigente nos períodos analisados.'),
      },
      answers('do autor'),
      answers('do INSS'),
      CLOSING,
    ],
  },
  {
    name: 'Auxílio-acidente — perícia técnica',
    area: 'federal',
    type: 'report',
    layout: { cover: false, summary: false },
    sections: [
      IDENTIFICATION,
      {
        title: 'Histórico do acidente',
        yes: p('Relato do segurado e comunicação de acidente de trabalho (CAT) juntada aos autos.'),
      },
      INSPECTION,
      {
        title: 'Redução da capacidade',
        yes: p('Há redução da capacidade para o trabalho que o segurado habitualmente exercia, em caráter permanente.'),
        no: p('Não há redução da capacidade para o trabalho habitual.'),
      },
      answers('do autor'),
      answers('do INSS'),
      CLOSING,
    ],
  },
  {
    name: 'Parecer divergente — insalubridade',
    details: 'Assistente técnico da reclamada',
    area: 'technical_assistance',
    type: 'technical_opinion',
    sections: [
      IDENTIFICATION,
      {
        title: 'Acompanhamento da diligência',
        yes: p(
          'Este assistente técnico acompanhou a vistoria realizada em [DATA_VISTORIA], no endereço [LOCAL_PERICIA].',
        ),
      },
      { title: 'Análise do laudo pericial', titleOnly: true },
      {
        title: 'Metodologia',
        level: 2,
        yes: p(
          'A medição pontual com decibelímetro não atende à NHO 01, que exige dosimetria representativa da jornada.',
        ),
      },
      {
        title: 'Equipamentos de proteção',
        level: 2,
        yes: p('O laudo desconsiderou as fichas de EPI com CA válido e o PCA implantado, que neutralizam o agente.'),
      },
      {
        title: 'Conclusão do assistente',
        yes: p('Diverge-se da conclusão pericial: não há insalubridade no período imprescrito.'),
        no: p('Concorda-se com a conclusão pericial, com as ressalvas acima.'),
      },
      OPINION_CLOSING,
    ],
  },
  {
    name: 'Impugnação ao laudo de vícios construtivos',
    details: 'Assistente técnico da construtora',
    area: 'technical_assistance',
    type: 'technical_opinion',
    layout: { font: 'calibri' },
    sections: [
      IDENTIFICATION,
      {
        title: 'Considerações iniciais',
        yes: p('O presente parecer analisa o laudo pericial quanto à origem das anomalias e ao orçamento apresentado.'),
      },
      {
        title: 'Origem das anomalias',
        yes: p(
          'As fotografias do laudo mostram jardineiras sem manutenção e drenos obstruídos, o que indica origem exógena.',
        ),
      },
      {
        title: 'Orçamento',
        yes: p(
          'O orçamento pericial inclui itens fora do escopo da lide e quantitativos acima dos levantados na vistoria.',
        ),
      },
      OPINION_CLOSING,
    ],
  },
  {
    name: 'Vistoria cautelar de vizinhança',
    details: 'Antes do início de obra com escavação de subsolo',
    area: 'Vistoria cautelar',
    type: 'report',
    sections: [
      {
        title: 'Contratante',
        yes: p(
          'Vistoria contratada por [NOME_AUTOR], responsável pela obra a ser executada no endereço [LOCAL_PERICIA].',
        ),
      },
      {
        title: 'Objetivo',
        yes: p(
          'Registrar o estado de conservação dos imóveis lindeiros antes do início da obra, para resguardo das partes.',
        ),
      },
      {
        title: 'Imóveis vistoriados',
        yes: p(
          'Foram vistoriados os imóveis confrontantes à direita, à esquerda e aos fundos, com autorização dos ocupantes.',
        ),
      },
      {
        title: 'Registro fotográfico',
        yes: p(
          'As anomalias preexistentes (fissuras, umidade, destacamentos) estão registradas e numeradas no Anexo I.',
        ),
      },
      {
        title: 'Considerações finais',
        yes: p('Recomenda-se nova vistoria ao término da escavação e ao final da obra.'),
      },
      CLOSING,
    ],
  },
  {
    name: 'Avaliação de terreno rural',
    details: 'NBR 14653-3 — terra nua e benfeitorias',
    area: 'Laudo de avaliação',
    type: 'report',
    sections: [
      { title: 'Solicitante', yes: p('[NOME_AUTOR].') },
      {
        title: 'Identificação do imóvel',
        yes: p('Imóvel rural com área de (área) ha, matrícula nº (matrícula), localizado em [COMARCA].'),
      },
      {
        title: 'Vistoria',
        yes: p(
          'Vistoria realizada em [DATA_VISTORIA], com percurso das divisas, das áreas de lavoura, pastagem e reserva legal.',
        ),
      },
      {
        title: 'Metodologia',
        yes: p(
          'Método comparativo direto de dados de mercado para a terra nua e método da quantificação de custo para as benfeitorias.',
        ),
      },
      { title: 'Valor do imóvel', yes: p('Valor de mercado do imóvel: R$ (valor).') },
      CLOSING,
    ],
  },
  {
    name: 'Laudo de insalubridade da empresa',
    details: 'LTIP para o PGR e o eSocial',
    area: 'Consultoria',
    type: 'report',
    layout: { titleColor: '#1f4d3a' },
    sections: [
      { title: 'Identificação da empresa', yes: p('[NOME_AUTOR], estabelecimento situado em [LOCAL_PERICIA].') },
      {
        title: 'Objetivo',
        yes: p(
          'Avaliar as condições de insalubridade e periculosidade dos ambientes de trabalho, conforme NR-15 e NR-16.',
        ),
      },
      {
        title: 'Grupos homogêneos de exposição',
        yes: p('Os cargos foram agrupados por setor e atividade, conforme o inventário de riscos do PGR.'),
      },
      {
        title: 'Avaliações quantitativas',
        yes: p('Os resultados das avaliações de ruído, calor e agentes químicos estão no Anexo II.'),
      },
      {
        title: 'Conclusão por cargo',
        yes: p('A tabela a seguir indica, por cargo, o enquadramento e o grau do adicional devido.'),
      },
      CLOSING,
    ],
  },
  {
    name: 'Vistoria de imóvel urbano com drone',
    area: 'Parceria',
    type: 'report',
    sections: [
      { title: 'Contratante', yes: p('[NOME_AUTOR].') },
      {
        title: 'Vistoria',
        yes: p('Vistoria realizada em [DATA_VISTORIA], com levantamento aéreo por drone e ortofoto do lote.'),
      },
      {
        title: 'Constatações',
        yes: p('Descrição das construções, das divisas e do estado de conservação, com as imagens no Anexo I.'),
      },
      CLOSING,
    ],
  },
  {
    name: 'Resposta a esclarecimentos',
    details: 'Petição de esclarecimentos após impugnação do laudo',
    type: 'report',
    layout: { cover: false, summary: false },
    sections: [
      IDENTIFICATION,
      {
        title: 'Esclarecimentos ao(à) reclamante',
        yes: p('Em resposta ao item (número) da manifestação, esclarece-se que...'),
      },
      {
        title: 'Esclarecimentos à reclamada',
        yes: p('Em resposta ao item (número) da manifestação, esclarece-se que...'),
      },
      { title: 'Ratificação', yes: p('Ratifica-se integralmente a conclusão do laudo pericial.') },
      CLOSING,
    ],
  },
  {
    name: 'Parecer sobre quesitos complementares',
    type: 'technical_opinion',
    sections: [
      IDENTIFICATION,
      { title: 'Quesitos complementares', yes: p('1) Resposta: (resposta).', '2) Resposta: (resposta).') },
      OPINION_CLOSING,
    ],
  },
];

const run = async (): Promise<void> => {
  if (env.NODE_ENV === 'production') throw new Error('seed:templates não roda em produção');
  if (!email) throw new Error('informe o e-mail do login: pnpm --filter api run seed:templates <e-mail>');
  await connect(env.MONGODB_URI);
  const owner = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!owner?.Tenant) throw new Error(`nenhum usuário com escritório e o e-mail ${email}`);
  const Tenant = owner.Tenant;

  // A copy of each standard template, as the office does with "Usar no escritório".
  const copies = DEFAULT_TEMPLATES.map(({ id: _id, isDefault: _default, sections, ...template }) => ({
    ...template,
    Tenant,
    sections: sections.map(({ id: _sectionId, ...section }) => section),
  }));
  const own = TEMPLATES.map(({ sections, layout, ...template }) => ({
    ...template,
    Tenant,
    layout: { ...REPORT_LAYOUT_DEFAULT, ...layout },
    sections: sections.map((section) => ({
      title: section.title,
      level: section.level ?? 1,
      titleOnly: section.titleOnly ?? false,
      pageBreak: section.pageBreak ?? false,
      unnumbered: false,
      yesText: section.yes ?? '',
      noText: section.no ?? '',
    })),
  }));
  const created = await Template.insertMany([...copies, ...own]);
  console.log(JSON.stringify({ event: 'seed.templates.done', tenant: Tenant.toString(), templates: created.length }));
  await disconnect();
};

void run();
