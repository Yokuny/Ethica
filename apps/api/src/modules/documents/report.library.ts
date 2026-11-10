import { REPORT_LAYOUT_DEFAULT } from '@ethica/contracts';
import type { TemplateRecord, TemplateSectionRecord } from './report.schema.js';

// Default library (LAU-05, LAU-06, AD-127): short base text citing the standard, in the variants
// "yes" and "no", for the expert to review and complete. Text in parentheses is what they
// fill in. Applies to every tenant, read-only; the office clones it to adapt (AD-126).

const p = (...paragraphs: string[]): string => paragraphs.map((text) => `<p>${text}</p>`).join('');

type Section = Omit<TemplateSectionRecord, 'id' | 'titleOnly' | 'pageBreak' | 'unnumbered'> &
  Partial<Pick<TemplateSectionRecord, 'titleOnly' | 'pageBreak' | 'unnumbered'>>;

const group = (title: string, pageBreak = false): Section => ({
  title,
  level: 1,
  titleOnly: true,
  pageBreak,
  yesText: '',
  noText: '',
});

const IDENTIFICATION: Section = {
  title: 'Identificação do processo',
  level: 1,
  yesText: p(
    'Processo nº [NUMERO_PROCESSO], em trâmite na [VARA] ([TRIBUNAL]).',
    '[DENOMINACAO_AUTOR]: [NOME_AUTOR]',
    '[DENOMINACAO_REU]: [NOME_REU]',
    'Objeto: [OBJETO].',
  ),
  noText: p(
    'Processo nº [NUMERO_PROCESSO], em trâmite na [VARA] ([TRIBUNAL]).',
    '[DENOMINACAO_AUTOR]: [NOME_AUTOR]',
    '[DENOMINACAO_REU]: [NOME_REU]',
  ),
};

const ENCERRAMENTO: Section = {
  title: 'Encerramento',
  level: 1,
  yesText: p(
    'Nada mais havendo a esclarecer, encerra-se o presente documento, colocando-se o signatário à disposição do Juízo para os esclarecimentos que se fizerem necessários.',
    '[DATA_EXTENSO].',
    '[PERITO_NOME]<br />[PERITO_FORMACAO] — [PERITO_REGISTRO]',
  ),
  noText: p('Encerra-se o presente documento.', '[DATA_EXTENSO].', '[PERITO_NOME]<br />[PERITO_REGISTRO]'),
};

// NR-15: one annex per agent. Additional pay grade per item 15.2 of NR-15.
const attachment = (number: string, agent: string, sim: string, nao: string): Section => ({
  title: `Anexo ${number} — ${agent}`,
  level: 2,
  yesText: p(sim),
  noText: p(nao),
});

const NR15: Section[] = [
  group('Insalubridade — NR-15', true),
  attachment(
    '1',
    'Ruído contínuo ou intermitente',
    'A avaliação por dosimetria (equipamento, data e jornada avaliada) indicou nível de exposição acima do limite de tolerância do Quadro do Anexo 1 da NR-15 (85 dB(A) para 8 horas diárias), sem neutralização por protetor auricular eficaz. Caracteriza insalubridade em grau médio.',
    'A avaliação por dosimetria (equipamento, data e jornada avaliada) indicou nível de exposição abaixo do limite de tolerância do Quadro do Anexo 1 da NR-15, ou a exposição foi neutralizada por protetor auricular eficaz. Não caracteriza insalubridade pelo Anexo 1.',
  ),
  attachment(
    '2',
    'Ruído de impacto',
    'Os níveis de pico medidos superaram o limite de tolerância do Anexo 2 da NR-15 (130 dB linear ou 120 dB(C) em resposta rápida). Caracteriza insalubridade em grau médio.',
    'Não há exposição a ruído de impacto acima do limite de tolerância do Anexo 2 da NR-15.',
  ),
  attachment(
    '3',
    'Calor',
    'A avaliação do IBUTG (equipamento, local e taxa metabólica da atividade) indicou exposição acima do limite de tolerância do Anexo 3 da NR-15. Caracteriza insalubridade em grau médio.',
    'A avaliação do IBUTG indicou exposição dentro do limite de tolerância do Anexo 3 da NR-15, ou não há fonte de calor relevante no posto de trabalho.',
  ),
  attachment(
    '4',
    'Iluminação',
    'O Anexo 4 da NR-15 foi revogado pela Portaria MTPS nº 3.751/1990; as condições de iluminação são registradas apenas como informação (NR-17).',
    'O Anexo 4 da NR-15 foi revogado pela Portaria MTPS nº 3.751/1990; iluminação não enseja adicional de insalubridade.',
  ),
  attachment(
    '5',
    'Radiações ionizantes',
    'Há exposição a radiações ionizantes acima dos limites fixados pela Comissão Nacional de Energia Nuclear (CNEN), conforme o Anexo 5 da NR-15. Caracteriza insalubridade em grau máximo.',
    'Não há exposição a fontes de radiação ionizante no posto de trabalho.',
  ),
  attachment(
    '6',
    'Trabalho sob condições hiperbáricas',
    'As atividades eram realizadas sob ar comprimido ou em mergulho, nas condições do Anexo 6 da NR-15. Caracteriza insalubridade em grau máximo.',
    'Não há trabalho sob condições hiperbáricas.',
  ),
  attachment(
    '7',
    'Radiações não ionizantes',
    'Há exposição sem proteção adequada a radiações não ionizantes (micro-ondas, ultravioleta ou laser), avaliada qualitativamente conforme o Anexo 7 da NR-15. Caracteriza insalubridade em grau médio.',
    'Não há exposição a radiações não ionizantes, ou a proteção fornecida foi adequada.',
  ),
  attachment(
    '8',
    'Vibrações',
    'A avaliação (equipamento e método) indicou aceleração resultante de exposição normalizada acima do limite do Anexo 8 da NR-15 (mãos e braços: 5 m/s²; corpo inteiro: 1,1 m/s² ou VDVR de 21 m/s¹,⁷⁵). Caracteriza insalubridade em grau médio.',
    'A exposição a vibrações ficou abaixo dos limites do Anexo 8 da NR-15, ou não há fonte de vibração relevante.',
  ),
  attachment(
    '9',
    'Frio',
    'As atividades eram exercidas no interior de câmaras frigoríficas ou locais com condições similares, sem proteção adequada, conforme o Anexo 9 da NR-15. Caracteriza insalubridade em grau médio.',
    'Não há exposição ao frio nas condições do Anexo 9 da NR-15, ou a proteção fornecida foi adequada.',
  ),
  attachment(
    '10',
    'Umidade',
    'As atividades eram exercidas em locais alagados ou encharcados, com umidade excessiva capaz de produzir danos à saúde, conforme o Anexo 10 da NR-15. Caracteriza insalubridade em grau médio.',
    'Não há exposição a umidade excessiva nas condições do Anexo 10 da NR-15.',
  ),
  attachment(
    '11',
    'Agentes químicos com limite de tolerância',
    'A avaliação quantitativa (agente, método de coleta e laboratório) indicou concentração acima do limite de tolerância do Quadro 1 do Anexo 11 da NR-15. Caracteriza insalubridade no grau indicado para o agente (mínimo, médio ou máximo).',
    'A avaliação quantitativa indicou concentração abaixo do limite de tolerância do Quadro 1 do Anexo 11 da NR-15, ou não há exposição a esses agentes.',
  ),
  attachment(
    '12',
    'Poeiras minerais',
    'Há exposição a poeiras minerais (asbesto, manganês ou sílica livre cristalizada) acima dos limites do Anexo 12 da NR-15. Caracteriza insalubridade em grau máximo.',
    'Não há exposição a poeiras minerais acima dos limites do Anexo 12 da NR-15.',
  ),
  attachment(
    '13',
    'Agentes químicos (avaliação qualitativa)',
    'As atividades envolviam contato com agentes relacionados no Anexo 13 da NR-15 (identificar a atividade e o agente, por exemplo hidrocarbonetos e outros compostos de carbono), sem proteção eficaz. Caracteriza insalubridade no grau indicado para a atividade. Para benzeno, observar o Anexo 13-A.',
    'As atividades não envolviam contato com os agentes relacionados no Anexo 13 da NR-15, ou a proteção fornecida foi eficaz.',
  ),
  attachment(
    '13-A',
    'Benzeno',
    'As atividades envolviam exposição ocupacional ao benzeno nas situações do Anexo 13-A da NR-15 (identificar a atividade, por exemplo abastecimento de combustíveis ou manuseio de produtos com benzeno). A exposição é avaliada qualitativamente e não admite neutralização por EPI. Caracteriza insalubridade em grau máximo.',
    'As atividades não envolviam exposição ocupacional ao benzeno nas situações do Anexo 13-A da NR-15.',
  ),
  attachment(
    '14',
    'Agentes biológicos',
    'As atividades envolviam contato permanente com agentes biológicos nas situações do Anexo 14 da NR-15 (identificar: pacientes em isolamento, lixo urbano, estabelecimentos de saúde etc.). Caracteriza insalubridade em grau (médio ou máximo, conforme a situação).',
    'As atividades não envolviam contato permanente com agentes biológicos nas situações do Anexo 14 da NR-15.',
  ),
];

// NR-16: 30% additional pay over the base salary (art. 193 of the CLT).
const hazardousConditions = (title: string, sim: string, nao: string): Section => ({
  title,
  level: 2,
  yesText: p(`${sim} Caracteriza periculosidade, com adicional de 30% (art. 193 da CLT).`),
  noText: p(nao),
});

const NR16: Section[] = [
  group('Periculosidade — NR-16', true),
  hazardousConditions(
    'Anexo 1 — Explosivos',
    'As atividades eram exercidas com explosivos ou em área de risco, nas condições do Anexo 1 da NR-16.',
    'Não há atividade ou permanência em área de risco com explosivos.',
  ),
  hazardousConditions(
    'Anexo 2 — Inflamáveis',
    'As atividades eram exercidas com inflamáveis ou em área de risco, nas condições do Anexo 2 da NR-16 (identificar a atividade e a área de risco).',
    'Não há atividade ou permanência habitual em área de risco com inflamáveis, nas condições do Anexo 2 da NR-16.',
  ),
  hazardousConditions(
    'Anexo 3 — Segurança pessoal ou patrimonial',
    'As atividades de segurança pessoal ou patrimonial expunham o trabalhador a roubos ou outras espécies de violência física, nas condições do Anexo 3 da NR-16.',
    'As atividades não se enquadram nas condições do Anexo 3 da NR-16.',
  ),
  hazardousConditions(
    'Anexo 4 — Energia elétrica',
    'As atividades eram exercidas em instalações ou equipamentos elétricos energizados, nas condições do Anexo 4 da NR-16.',
    'Não há atividade com exposição a energia elétrica nas condições do Anexo 4 da NR-16.',
  ),
  hazardousConditions(
    'Anexo 5 — Motocicleta',
    'As atividades exigiam o uso de motocicleta em vias públicas, nas condições do Anexo 5 da NR-16 (verificar a vigência aplicável ao período).',
    'As atividades não exigiam o uso de motocicleta em vias públicas, ou o uso era eventual.',
  ),
  hazardousConditions(
    'Radiações ionizantes ou substâncias radioativas',
    'As atividades se enquadram no quadro de atividades e operações perigosas com radiações ionizantes ou substâncias radioativas anexo à NR-16.',
    'Não há atividade com radiações ionizantes ou substâncias radioativas.',
  ),
];

const questions = (de: string): Section => ({
  title: `Quesitos ${de}`,
  level: 2,
  yesText: p('Quesito 1: (transcrever o quesito).', 'Resposta: (responder).'),
  noText: p(`Não foram apresentados quesitos ${de}.`),
});

const LABOR_CONTRACT: Section = {
  title: 'Dados do contrato de trabalho',
  level: 1,
  yesText: p(
    'Admissão: [DATA_ADMISSAO].',
    'Demissão: [DATA_DEMISSAO].',
    'Função: [FUNCAO_RECLAMANTE].',
    'Período imprescrito considerado: [PERIODO_IMPRESCRITO].',
  ),
  noText: p('Os dados do contrato de trabalho não constam dos autos (informar o que foi considerado).'),
};

const ANALYZED_DOCUMENTS: Section = {
  title: 'Documentos analisados',
  level: 1,
  yesText: `${p('Foram analisados os seguintes documentos juntados aos autos ou apresentados na vistoria:')}<ul><li>Programa de Gerenciamento de Riscos (PGR) ou PPRA do período</li><li>Programa de Controle Médico de Saúde Ocupacional (PCMSO)</li><li>Laudo Técnico das Condições Ambientais do Trabalho (LTCAT)</li><li>Perfil Profissiográfico Previdenciário (PPP)</li><li>Fichas de entrega de EPI e Certificados de Aprovação</li><li>Ordens de serviço e registros de treinamento</li></ul>`,
  noText: p(
    'Não foram apresentados documentos de segurança e saúde do trabalho; a análise se baseou na vistoria e nas informações das partes.',
  ),
};

const RISK_RECOGNITION: Section = {
  title: 'Reconhecimento dos riscos',
  level: 1,
  yesText: p(
    'Na vistoria foram identificados os seguintes agentes no ambiente de trabalho: [AGENTES_PRESENTES].',
    'Não foram constatados: [AGENTES_AUSENTES].',
  ),
  noText: p('Não foram identificados agentes insalubres ou perigosos no ambiente de trabalho.'),
};

const LEGAL_BASIS: Section = {
  title: 'Fundamentação legal',
  level: 1,
  yesText: p(
    'A caracterização da insalubridade e da periculosidade é feita por perícia a cargo de engenheiro do trabalho ou médico do trabalho (art. 195 da CLT), segundo as normas do Ministério do Trabalho: NR-15 (atividades e operações insalubres, art. 189 da CLT) e NR-16 (atividades e operações perigosas, art. 193 da CLT).',
    'O adicional de insalubridade é de 40%, 20% ou 10%, conforme o grau máximo, médio ou mínimo (art. 192 da CLT e item 15.2 da NR-15); o de periculosidade é de 30% sobre o salário-base (art. 193, § 1º, da CLT). Os adicionais não se acumulam (art. 193, § 2º, da CLT).',
    'O fornecimento de EPI eficaz, com Certificado de Aprovação, treinamento e fiscalização do uso, elimina a insalubridade quando neutraliza o agente (Súmulas 80 e 289 do TST; NR-6).',
  ),
  noText: p('A análise segue a NR-15 e a NR-16 e os arts. 189 a 197 da CLT.'),
};

const EXPERT_REPORT: Section[] = [
  IDENTIFICATION,
  {
    title: 'Objetivo',
    level: 1,
    yesText: p(
      'O presente laudo tem por objetivo verificar se as atividades exercidas por [NOME_AUTOR], na função de [FUNCAO_RECLAMANTE], no período de [PERIODO_IMPRESCRITO], foram executadas em condições insalubres ou perigosas, nos termos dos arts. 189 a 197 da CLT e das Normas Regulamentadoras NR-15 e NR-16.',
    ),
    noText: p(
      'O presente laudo tem por objetivo responder aos quesitos e esclarecer os pontos técnicos fixados pelo Juízo.',
    ),
  },
  LABOR_CONTRACT,
  {
    title: 'Metodologia e vistoria',
    level: 1,
    yesText: p(
      'A vistoria foi realizada em [DATA_VISTORIA], no local periciado ([LOCAL_PERICIA]), com início às [HORA_VISTORIA]. Foram feitas entrevistas, inspeção dos postos de trabalho, análise dos documentos dos autos (PGR, PCMSO, LTCAT, fichas de entrega de EPI) e, quando cabível, avaliações quantitativas com instrumentos calibrados.',
      'Estiveram presentes: [PRESENTES_VISTORIA].',
      'Foram solicitados às partes: [DOCUMENTOS_SOLICITADOS].',
    ),
    noText: p(
      'A vistoria não pôde ser realizada no local de trabalho (informar o motivo). A análise foi feita com base nos documentos dos autos e nas informações prestadas pelas partes.',
    ),
  },
  ANALYZED_DOCUMENTS,
  {
    title: 'Atividades exercidas',
    level: 1,
    yesText: p(
      'Segundo as informações colhidas na vistoria, confirmadas pelas partes, o trabalhador exercia a função de [FUNCAO_RECLAMANTE], com as seguintes atividades: [FUNCOES_AUTOR].',
      'Paradigmas indicados pelo(a) [DENOMINACAO_AUTOR]: [PARADIGMAS_AUTOR].',
    ),
    noText: p(
      'As partes divergiram quanto às atividades exercidas.',
      'Versão do(a) [DENOMINACAO_AUTOR]: [FUNCOES_AUTOR]. Paradigmas indicados: [PARADIGMAS_AUTOR].',
      'Versão do(a) [DENOMINACAO_REU]: [FUNCOES_REU]. Paradigmas indicados: [PARADIGMAS_REU].',
    ),
  },
  {
    title: 'Equipamentos de proteção individual',
    level: 1,
    yesText: p(
      'Houve fornecimento de EPI com Certificado de Aprovação válido, comprovado por fichas assinadas, com treinamento e fiscalização do uso (NR-6), suficientes para neutralizar o agente (Súmula 80 do TST).',
    ),
    noText: p(
      'Não houve comprovação de fornecimento regular de EPI com Certificado de Aprovação válido, de treinamento ou de fiscalização do uso (NR-6); a entrega, quando houve, não neutralizou o agente (Súmula 289 do TST).',
    ),
  },
  RISK_RECOGNITION,
  LEGAL_BASIS,
  ...NR15,
  ...NR16,
  group('Quesitos', true),
  questions('pelo(a) [DENOMINACAO_AUTOR]'),
  questions('pelo(a) [DENOMINACAO_REU]'),
  questions('pelo Juízo'),
  {
    title: 'Conclusão',
    level: 1,
    pageBreak: true,
    yesText: p(
      'Com base na vistoria, nas avaliações e nos documentos dos autos, conclui-se que as atividades de [NOME_AUTOR], no período de [PERIODO_IMPRESCRITO], foram exercidas em condições (insalubres em grau ___, nos termos do Anexo ___ da NR-15 / perigosas, nos termos do Anexo ___ da NR-16).',
    ),
    noText: p(
      'Com base na vistoria, nas avaliações e nos documentos dos autos, conclui-se que as atividades de [NOME_AUTOR], no período de [PERIODO_IMPRESCRITO], não foram exercidas em condições insalubres nem perigosas, nos termos da NR-15 e da NR-16.',
    ),
  },
  {
    title: 'Honorários periciais',
    level: 1,
    yesText: p(
      'Requer o arbitramento dos honorários periciais em R$ (valor), considerando a complexidade da matéria e o tempo dedicado à vistoria, às avaliações e à elaboração deste laudo.',
    ),
    noText: p(
      'Os honorários periciais já foram fixados pelo Juízo; requer a sua liberação após a entrega deste laudo.',
    ),
  },
  ENCERRAMENTO,
];

const table = (header: string[], ...rows: string[][]): string =>
  `<table><tbody><tr>${header.map((cell) => `<th>${cell}</th>`).join('')}</tr>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

// Technical opinion of the technical assistant after the inspection (pre-report), in the order of the
// expert's own model: preliminary data, documents, functions, protection, opinion and conclusion.
const TECHNICAL_OPINION: Section[] = [
  IDENTIFICATION,
  {
    title: 'Dados preliminares',
    level: 1,
    yesText: table(
      ['Item', 'Informação'],
      ['Data da perícia', '[DATA_VISTORIA], às [HORA_VISTORIA] (início e término)'],
      ['Local da perícia', '[LOCAL_PERICIA]'],
      ['Objeto da perícia', '[OBJETO]'],
      ['Perito do Juízo', '(nome e formação)'],
      ['Assistente técnico da parte contrária', '(nome, formação e registro)'],
      ['Período contratual', '[DATA_ADMISSAO] a [DATA_DEMISSAO]'],
      ['Período controvertido', '(período)'],
      ['Período imprescrito', '[PERIODO_IMPRESCRITO]'],
    ),
    noText: table(
      ['Item', 'Informação'],
      ['Objeto da perícia', '[OBJETO]'],
      ['Perito do Juízo', '(nome e formação)'],
      ['Período imprescrito', '[PERIODO_IMPRESCRITO]'],
    ),
  },
  {
    title: 'Objetivo',
    level: 1,
    yesText: p(
      'O presente parecer tem por objetivo registrar, sob a ótica técnica da assistência ao(à) [DENOMINACAO_AUTOR], os elementos observados durante a diligência pericial realizada nas instalações do(a) [DENOMINACAO_REU], em especial nos locais em que eram exercidas as atividades, a fim de subsidiar a análise quanto à existência de condições perigosas (NR-16) e, de forma complementar, de condições insalubres (NR-15), no período de [PERIODO_IMPRESCRITO].',
    ),
    noText: p(
      'O presente parecer técnico, elaborado pelo assistente técnico indicado pela parte (indicar), tem por objetivo analisar o laudo pericial e apresentar as conclusões técnicas sobre a matéria.',
    ),
  },
  {
    title: 'Documentos dos autos considerados',
    level: 1,
    yesText: `${p('Relacionam-se a seguir os documentos dos autos considerados na elaboração deste parecer:')}${table(
      ['Documento', 'ID'],
      ...[
        'Petição inicial',
        'Contestação',
        'Holerites',
        'Perfil Profissiográfico Previdenciário (PPP)',
        'PCMSO',
        'PGR',
        'LTCAT',
        'PPRA',
        'Certificados e treinamentos',
        'ASOs',
        'Descritivo de função',
        'Fichas de EPI',
        'Certificados de Aprovação (CAs)',
        'Laudo pericial de paradigma (prova emprestada, processo nº)',
      ].map((document) => [document, '(Id)']),
      ['Documentos solicitados na diligência', '[DOCUMENTOS_SOLICITADOS]'],
    )}`,
    noText: p(
      'Não houve documentação apresentada, tampouco solicitada durante a diligência; o parecer se baseia nos documentos dos autos (indicar).',
    ),
  },
  {
    title: 'Funções exercidas',
    level: 1,
    yesText: `${p('Função informada nos autos: [FUNCAO_RECLAMANTE].')}${table(
      ['Período', 'Cargo / função (PPP)', 'Lotação (PPP)'],
      ['(período)', '(cargo)', '(setor)'],
    )}${p('Fonte: PPP, item 13. Marcar os períodos que integram o período controvertido.')}`,
    noText: p(
      'As partes divergiram quanto às atividades exercidas.',
      'Versão do(a) [DENOMINACAO_AUTOR]: [FUNCOES_AUTOR].',
      'Versão do(a) [DENOMINACAO_REU]: [FUNCOES_REU].',
    ),
  },
  {
    title: 'Acompanhamento da vistoria',
    level: 1,
    yesText: p(
      'O assistente técnico acompanhou a vistoria realizada pelo perito do Juízo em [DATA_VISTORIA], no local periciado ([LOCAL_PERICIA]).',
      'Estiveram presentes: [PRESENTES_VISTORIA].',
    ),
    noText: p('O assistente técnico não acompanhou a vistoria (informar o motivo).'),
  },
  {
    title: 'Dos dispositivos de proteção',
    level: 1,
    yesText: p(
      'Durante a diligência, o(a) [DENOMINACAO_AUTOR] informou que recebia os seguintes EPIs: (listar).',
      'Destaca-se que, no caso da periculosidade, o fornecimento de equipamentos de proteção individual não afasta, por si só, o risco acentuado decorrente da energização do sistema ou da permanência em área de risco, uma vez que tais equipamentos atuam na mitigação das consequências e não na eliminação da condição perigosa.',
    ),
    noText: p(
      'Não houve comprovação de fornecimento regular de EPI com Certificado de Aprovação válido, de treinamento ou de fiscalização do uso (NR-6).',
    ),
  },
  {
    title: 'Medições de agentes quantitativos',
    level: 1,
    yesText: `${p('As medições abaixo foram realizadas em conjunto com o perito do Juízo, nos mesmos pontos e condições:')}${table(
      ['Agente', 'Instrumento', 'Resultado do perito', 'Resultado do assistente', 'Limite de tolerância'],
      ['(agente)', '(instrumento)', '(valor)', '(valor)', '(limite)'],
    )}`,
    noText: p('Não foram realizadas medições de agentes quantitativos em conjunto com o perito do Juízo.'),
  },
  {
    title: 'Análise do laudo pericial',
    level: 1,
    yesText: p(
      'O assistente técnico concorda com a metodologia e as conclusões do laudo pericial, pelos seguintes fundamentos: (descrever).',
    ),
    noText: p(
      'O assistente técnico diverge da metodologia ou das conclusões do laudo pericial nos seguintes pontos: (descrever).',
    ),
  },
  {
    title: 'Impugnação do laudo pericial',
    level: 1,
    yesText: p('Impugna-se o laudo pericial pelos seguintes fundamentos técnicos: (descrever).'),
    noText: p('Não há impugnação ao laudo pericial.'),
  },
  {
    title: 'Quesitos complementares',
    level: 1,
    yesText: p('Quesito complementar 1: (transcrever).', 'Justificativa técnica: (descrever).'),
    noText: p('Não há quesitos complementares.'),
  },
  {
    title: 'Quesitos suplementares',
    level: 1,
    yesText: p('Quesito suplementar 1: (transcrever).', 'Justificativa técnica: (descrever).'),
    noText: p('Não há quesitos suplementares.'),
  },
  {
    title: 'Parecer técnico e conclusão',
    level: 1,
    pageBreak: true,
    yesText: p(
      'Diante dos elementos observados na diligência pericial e dos documentos constantes dos autos, o assistente técnico entende que as atividades exercidas pelo(a) [DENOMINACAO_AUTOR] no período de [PERIODO_IMPRESCRITO] <strong>caracterizam condição (perigosa / insalubre)</strong>, com enquadramento no (anexo, item e alínea da NR-16 ou NR-15), uma vez que (fundamentar: lotação, atividades e instalações a que esteve exposto).',
    ),
    noText: p('Pelo exposto, o assistente técnico ratifica as conclusões do laudo pericial.'),
  },
  {
    title: 'Considerações finais',
    level: 1,
    yesText: p(
      'Este parecer técnico foi elaborado exclusivamente para o processo em epígrafe, sendo vedado o seu aproveitamento, total ou parcial, em outros trabalhos sem a autorização expressa deste profissional ou do(a) MM(a). Juiz(a).',
      'É o parecer.',
    ),
    noText: p('É o parecer.'),
  },
  ENCERRAMENTO,
];

// Labor report of the expert (NLA-04): the items and sub-items of the model she uses, in her order. Items
// the case already fills come with text; the others start empty for her to write.
const item = (title: string, level: number, text = '', extra: Partial<Section> = {}): Section => ({
  title,
  level,
  yesText: text,
  noText: text,
  ...extra,
});
const heading = (title: string, level = 1, pageBreak = false): Section => ({ ...group(title, pageBreak), level });
const fromLibrary = (title: string, level: number, base: Section | undefined): Section => ({
  title,
  level,
  yesText: base?.yesText ?? '',
  noText: base?.noText ?? '',
});
const nr15 = (annex: string) => NR15.find((section) => section.title.startsWith(`Anexo ${annex} — `));
const nr16 = (prefix: string) => NR16.find((section) => section.title.startsWith(prefix));
const byTitle = (title: string) => EXPERT_REPORT.find((section) => section.title === title);
const answers = (title: string, of: string): Section => ({ ...questions(of), title, level: 2 });

const LABOR_REPORT: Section[] = [
  item('Objeto da perícia', 1, p('[OBJETO].'), { unnumbered: true }),
  { ...heading('Considerações preliminares'), unnumbered: true },
  heading('Introdução'),
  item('Do amparo constitucional e legal', 2),
  item('Da insalubridade (NR-15)', 2),
  item('Da periculosidade (NR-16)', 2),
  item('Da análise ergonômica do trabalho (NR-17)', 2),
  item('Do acidente do trabalho e gestão de riscos (NR-1)', 2),
  item('Das condições ambientais e documentação previdenciária (PPP)', 2),
  item('Hierarquia de controle e conclusão', 2),
  heading('Preliminares'),
  fromLibrary('Dados do processo', 2, IDENTIFICATION),
  item('Ata de audiência', 2),
  item('Prova pericial conforme ata de audiência', 2),
  item('Comunicação', 2),
  heading('Vistorias'),
  item('Local e data', 2, p('Vistoria realizada em [DATA_VISTORIA], às [HORA_VISTORIA], em [LOCAL_PERICIA].')),
  item('Presentes', 2, p('[PRESENTES_VISTORIA].')),
  item('Reclamante', 3, p('[NOME_AUTOR].')),
  item('Reclamada', 3, p('[NOME_REU].')),
  heading('Período/função/atividades', 2),
  item(
    'Período',
    3,
    p('Admissão em [DATA_ADMISSAO] e demissão em [DATA_DEMISSAO]. Período imprescrito: [PERIODO_IMPRESCRITO].'),
  ),
  item('Função', 3, p('Função informada nos autos: [FUNCAO_RECLAMANTE].')),
  item(
    'Atividades',
    3,
    p(
      'Atividades relatadas pelo(a) [DENOMINACAO_AUTOR]: [FUNCOES_AUTOR].',
      'Atividades relatadas pelo(a) [DENOMINACAO_REU]: [FUNCOES_REU].',
    ),
  ),
  item('Dos locais de trabalho do(a) reclamante', 1),
  fromLibrary('Das medidas de proteção e controle', 1, byTitle('Equipamentos de proteção individual')),
  fromLibrary('Da documentação de segurança existente nos autos', 1, ANALYZED_DOCUMENTS),
  heading('Avaliação da insalubridade', 1, true),
  fromLibrary('Anexo 1 – Limites de Tolerância para Ruído contínuo ou intermitente', 2, nr15('1')),
  fromLibrary('Anexo 2 – Limites de tolerância para ruído de impacto', 2, nr15('2')),
  fromLibrary('Anexo 3 – Limites de tolerância para exposição ao calor', 2, nr15('3')),
  fromLibrary('Anexo 4 – Iluminamento', 2, nr15('4')),
  fromLibrary('Anexo 5 – Radiações ionizantes', 2, nr15('5')),
  fromLibrary('Anexo 6 – Trabalho sob condições hiperbáricas', 2, nr15('6')),
  fromLibrary('Anexo 7 – Radiações não ionizantes', 2, nr15('7')),
  fromLibrary('Anexo 8 – Vibrações', 2, nr15('8')),
  fromLibrary('Anexo 9 – Frio', 2, nr15('9')),
  fromLibrary('Anexo 10 – Umidade', 2, nr15('10')),
  fromLibrary(
    'Anexo 11 – Agentes químicos cuja insalubridade é caracterizada por limite de tolerância e inspeção no local de trabalho',
    2,
    nr15('11'),
  ),
  fromLibrary('Anexo 12 – Limites de tolerância para poeiras minerais', 2, nr15('12')),
  fromLibrary('Anexo 13 – Agentes químicos', 2, nr15('13')),
  fromLibrary('Anexo 14 – Agentes biológicos', 2, nr15('14')),
  heading('Do levantamento das atividades e operações perigosas', 1, true),
  fromLibrary('Anexo 1 – Atividades e operações perigosas com explosivos', 2, nr16('Anexo 1 ')),
  fromLibrary('Anexo 2 – Atividades e operações perigosas com inflamáveis', 2, nr16('Anexo 2 ')),
  fromLibrary(
    'Anexo 3 – Atividades e operações perigosas com exposição a roubos ou outras espécies de violência física nas atividades profissionais de segurança pessoal ou patrimonial',
    2,
    nr16('Anexo 3 '),
  ),
  fromLibrary('Anexo 4 - Atividades e operações perigosas com energia elétrica', 2, nr16('Anexo 4 ')),
  fromLibrary('Anexo 5 - Atividades perigosas em motocicleta', 2, nr16('Anexo 5 ')),
  item('Anexo 6 - Atividades perigosas dos agentes das autoridades de trânsito', 2),
  fromLibrary(
    'Anexo * - Atividades e operações perigosas com radiações ionizantes ou substâncias radioativas',
    2,
    nr16('Radiações'),
  ),
  heading('Acidente de trabalho', 1, true),
  item('Fundamentação técnico-científica', 2),
  item('Depoimento do acidente pelo(a) reclamante', 2),
  item('Depoimento do acidente pela reclamada', 2),
  item('Treinamentos normativos aplicáveis e atendimento', 2),
  item('Normas aplicáveis à atividade / acidente x atendimento', 2),
  item('Análise do acidente de trabalho', 2),
  item('Conformidades e não conformidades identificadas', 2),
  item('Conclusão técnica do acidente', 2),
  heading('Ergonomia', 1, true),
  item('Metodologia utilizada', 2),
  item('Organização do trabalho', 2),
  item('Análise da AET', 2),
  item('Conclusão da análise ergonômica', 2),
  heading('Avaliação do meio ambiente de trabalho', 1, true),
  item('Metodologia utilizada', 2),
  item('Treinamentos normativos aplicáveis e atendimento', 2),
  item('Normas aplicáveis à atividade x atendimento', 2),
  item('Conclusão da análise do meio ambiente de trabalho', 2),
  heading('Avaliação do PPP', 1, true),
  item('Metodologia utilizada', 2),
  item('LTCAT / PGR x riscos identificados', 2),
  item('Conformidades e não conformidades identificadas', 2),
  item('Conclusão da análise do PPP', 2),
  heading('Respostas aos quesitos', 1, true),
  answers('Reclamante', 'pelo(a) [DENOMINACAO_AUTOR]'),
  answers('1ª reclamada', 'pela 1ª reclamada'),
  answers('2ª reclamada', 'pela 2ª reclamada'),
  answers('Juízo', 'pelo Juízo'),
  { ...fromLibrary('Conclusão / parecer técnico', 1, byTitle('Conclusão')), pageBreak: true },
  fromLibrary('Honorários', 1, byTitle('Honorários periciais')),
  item('Considerações finais', 1),
  item(
    'Encerramento',
    1,
    p(
      'Nada mais havendo a esclarecer, encerra-se o presente laudo, colocando-se a signatária à disposição do Juízo para os esclarecimentos que se fizerem necessários.',
    ),
  ),
  item('Anexo I – Agendamento da perícia', 1, '', { pageBreak: true }),
  item('Anexo II – Avaliações ambientais', 1),
  item('Anexo III – Certificação de calibração', 1),
  item('Anexo IV – Referências bibliográficas', 1),
];

const withIds = (prefix: string, sections: Section[]): TemplateSectionRecord[] =>
  sections.map((section, index) => ({
    titleOnly: false,
    pageBreak: false,
    unnumbered: false,
    ...section,
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
  }));

// The first of each type is the one "Novo laudo" suggests (REPORT_DEFAULT_TEMPLATES). All of them leave with the
// expert's layout (AD-203); the area places the copy in the office library (AD-204).
export const DEFAULT_TEMPLATES: TemplateRecord[] = [
  {
    id: 'standard-labor-report',
    name: 'Laudo pericial trabalhista',
    area: 'labor',
    type: 'report',
    isDefault: true,
    sections: withIds('trabalhista', LABOR_REPORT),
    layout: REPORT_LAYOUT_DEFAULT,
  },
  {
    id: 'standard-technical_opinion',
    name: 'Parecer técnico',
    area: 'technical_assistance',
    type: 'technical_opinion',
    isDefault: true,
    sections: withIds('parecer', TECHNICAL_OPINION),
    layout: REPORT_LAYOUT_DEFAULT,
  },
  {
    id: 'standard-report',
    name: 'Laudo pericial (NR-15 e NR-16)',
    area: 'labor',
    type: 'report',
    isDefault: true,
    sections: withIds('laudo', EXPERT_REPORT),
    layout: REPORT_LAYOUT_DEFAULT,
  },
];
