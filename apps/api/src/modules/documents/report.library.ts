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

const list = (tag: 'ul' | 'ol', ...items: string[]): string =>
  `<${tag}>${items.map((text) => `<li>${text}</li>`).join('')}</${tag}>`;

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

// Objection to the court expert's report with a request for further clarification (art. 477 of the CPC),
// written by the technical assistant. Base text of the expert's own objection on hazardous work with
// electricity (NR-16, Annex 4, and NR-10); each point is a section to keep or drop.
const point = (title: string, yesText: string): Section => ({
  title,
  level: 2,
  yesText,
  noText: p('O laudo pericial não merece reparo neste ponto.'),
});

const TECHNICAL_OBJECTION: Section[] = [
  IDENTIFICATION,
  {
    title: 'Apresentação',
    level: 1,
    unnumbered: true,
    yesText: p(
      '(Parte assistida: [NOME_AUTOR] ou [NOME_REU]), já qualificada nos autos da ação em epígrafe, vem, por seu assistente técnico, [PERITO_NOME], [PERITO_FORMACAO] ([PERITO_REGISTRO]), respeitosamente perante Vossa Excelência, apresentar <strong>impugnação ao laudo pericial</strong> elaborado pelo(a) Ilustre Perito(a) (nome), juntado aos autos em (data) (Id), com pedido de esclarecimentos complementares, nos termos a seguir expostos.',
    ),
    noText: p(
      '(Parte assistida: [NOME_AUTOR] ou [NOME_REU]), por seu assistente técnico, [PERITO_NOME] ([PERITO_REGISTRO]), apresenta impugnação ao laudo pericial juntado aos autos em (data) (Id), nos termos a seguir expostos.',
    ),
  },
  {
    title: 'Síntese da impugnação técnica',
    level: 1,
    yesText: p(
      'O(A) Ilustre Perito(a) reconheceu que o(a) [DENOMINACAO_AUTOR] executava (descrever as atividades reconhecidas no laudo). Contudo, afastou (a periculosidade / a insalubridade) com fundamento em (resumir os fundamentos do laudo).',
      'Com a devida vênia, a conclusão pericial não se coaduna com (norma aplicável), diverge do entendimento consolidado em (súmula ou jurisprudência) e deixa de considerar (preceitos técnicos e legais).',
    ),
    noText: p('O laudo pericial merece reparo nos pontos técnicos a seguir expostos.'),
  },
  group('Da fundamentação técnica e contestação dos pontos do laudo'),
  point(
    'Da exposição eventual × intermitente',
    p(
      'O item 3 do Anexo 4 da NR-16 equipara o trabalho intermitente ao permanente e exclui apenas a exposição eventual, entendida como o caso fortuito ou aquela que não faz parte da rotina. Intervenções programadas, sejam semanais, mensais ou bimestrais, integram a rotina da função e configuram exposição intermitente. No mesmo sentido, a Súmula 361 do TST garante o adicional integral ainda que o trabalho em condições perigosas seja intermitente.',
      'Pela Súmula 364, I, do TST, o adicional só é indevido no contato fortuito ou no habitual por tempo extremamente reduzido. No risco elétrico, choque e arco causam lesões graves ou fatais em frações de segundo, de modo que a duração em minutos não basta para afastar a exposição; além disso, essa exceção pressupõe quantificar a exposição, o que o laudo não fez (TST, SDI-1, E-RR-300-69.2005.5.17.0007).',
      'A IEC TS 60479-1 estabelece que o perigo do choque elétrico depende da intensidade e da duração da passagem da corrente, com zonas tempo-corrente em milissegundos, e a IEEE 1584 calcula a energia do arco elétrico a partir do tempo de eliminação pela proteção, também em milissegundos. O dano, portanto, não depende do tempo de execução da tarefa (TST, RR-2414-72.2012.5.15.0077; RR-342-40.2013.5.03.0036; Ag-AIRR-685-85.2019.5.10.0018).',
      'O art. 193, I, da CLT considera perigosas as atividades que, por sua natureza ou métodos de trabalho, impliquem risco acentuado por exposição a energia elétrica (apontar a resposta a quesito que não alcançou o objeto da pergunta, art. 473, IV, do CPC).',
    ),
  ),
  point(
    'Medições em painéis energizados',
    p(
      'Medir tensão em painel energizado (tensão) é trabalho em instalação energizada. Com o painel aberto e as pontas de prova nos terminais, as mãos do executante tendem a ficar dentro da zona de risco definida no Anexo I da NR-10 (raio de 0,20 m para tensões abaixo de 1 kV), expostas a choque por contato acidental e a arco elétrico causado por curto-circuito da própria ponta de prova. Por isso a série IEC 61010 (partes 1 e 2-030) exige, em painéis de distribuição, instrumentos de categoria de medição CAT III ou superior.',
      'Pontos que o laudo não esclareceu: (descrever, com a folha do laudo).',
    ),
  ),
  point(
    'Desenergização sem impedimento de reenergização',
    p(
      'O enquadramento na alínea “c” do item 1 do Anexo 4 da NR-16 decorre de uma condição objetiva, o trabalho em instalação energizada sem atendimento ao item 10.2.8 da NR-10, e a norma não condiciona o adicional à culpa do empregador nem à conduta do empregado.',
      'Pelo item 10.5.1 da NR-10, a desenergização só é válida quando cumprida toda a sequência: seccionamento, impedimento de reenergização, constatação da ausência de tensão, aterramento temporário, proteção dos elementos energizados na zona controlada e sinalização de impedimento de reenergização. Sem o bloqueio, a instalação continua, tecnicamente, energizada, e não se aplica a exclusão da alínea “a” do item 2 do Anexo 4. Cabe à empresa fazer cumprir as normas de segurança (art. 157, I, da CLT).',
    ),
  ),
  point(
    'Intervenções com barramento energizado',
    p(
      'O laudo admitiu a intervenção (descrever) com o barramento energizado, sem atendimento ao subitem 10.2.8.2 da NR-10, e não verificou nenhuma das medidas do subitem 10.2.8.2.1 (isolação das partes vivas, obstáculos, barreiras, sinalização, seccionamento automático da alimentação ou bloqueio do religamento automático). Sem proteção coletiva no barramento, configura-se a hipótese da alínea “c” do item 1, salvo prova documental em contrário.',
      'A exclusão da alínea “c” do item 2 do Anexo 4 (operações elementares de ligar e desligar) só vale desde que os materiais e equipamentos elétricos estejam em conformidade com as normas técnicas oficiais, conformidade que o laudo não verificou.',
    ),
  ),
  point(
    'Remoção de barreira de proteção',
    p(
      'Durante a atividade (descrever, por exemplo termografia, e a duração), o(a) [DENOMINACAO_AUTOR] removia a barreira de proteção do barramento energizado (NR-10, 10.2.8.2.1). A barreira é a medida de proteção coletiva adotada naquele painel; sua remoção, com o barramento energizado, suprime a única medida existente e caracteriza a hipótese da alínea “c” do item 1 do Anexo 4, independentemente de contato físico com as partes vivas.',
    ),
  ),
  point(
    'Dos equipamentos de proteção individual',
    p(
      'A NR-6, no item 6.5.1, alíneas “a” e “c”, impõe à organização adquirir somente EPI aprovado pelo órgão competente e fornecer gratuitamente EPI adequado ao risco; o item 6.4.1 veda a utilização de EPI sem indicação do Certificado de Aprovação. No campo da eletricidade, o item 10.2.9.1 da NR-10 determina que, quando as medidas de proteção coletiva forem tecnicamente inviáveis ou insuficientes, sejam adotados EPIs específicos e adequados às atividades, e o item 10.2.9.2 exige vestimentas de trabalho adequadas.',
      'Na ficha de EPI (Id) consta: (descrever entregas sem C.A. ou ausência de luvas isolantes). A resposta ao quesito (número) partiu da conclusão para dispensar a análise, ponto que merece esclarecimento à luz do art. 473, § 1º, do CPC.',
    ),
  ),
  point(
    'Da base documental e do método adotado',
    p(
      'O art. 473, § 3º, do CPC autoriza o perito a valer-se de todos os meios necessários, inclusive solicitando documentos que estejam em poder da parte. A documentação de segurança elétrica é o próprio meio de prova do cumprimento do item 10.2.8 da NR-10: o Prontuário de Instalações Elétricas, obrigatório para estabelecimentos com carga instalada superior a 75 kW (NR-10, item 10.2.4), e os procedimentos de trabalho escritos (NR-10, item 10.11.1). Cabe ainda ao empregador a caracterização ou a descaracterização da periculosidade, mediante laudo técnico (NR-16, item 16.3).',
      'O art. 473, III e § 1º, do CPC exige que o laudo indique o método utilizado, demonstrando ser predominantemente aceito, e apresente a fundamentação com coerência lógica; o juiz apreciará a prova levando em conta o método utilizado pelo perito (art. 479 do CPC). Desde a Lei nº 12.740/2012, o adicional por energia elétrica rege-se pelo art. 193, I, da CLT e pelo Anexo 4 da NR-16. Como referência de boas práticas, a ABNT NBR 16384:2020 reúne os procedimentos técnicos aplicáveis a medições e desenergização.',
    ),
  ),
  {
    title: 'Do requerimento de esclarecimentos complementares',
    level: 1,
    yesText: `${p(
      'Diante dos pontos técnicos apontados, que demandam complementação, requer-se, com fulcro no <strong>art. 477, §§ 1º e 2º, do CPC</strong>, aplicável ao processo do trabalho por força do art. 769 da CLT e do art. 15 do CPC, que o(a) Ilustre Perito(a) seja intimado(a) a esclarecer e a responder aos seguintes quesitos:',
    )}${list(
      'ol',
      'As atividades (descrever) faziam parte das atribuições rotineiras e programadas da função?',
      'Considerando o texto expresso do item 3 do Anexo 4 da NR-16, qual o fundamento normativo para considerar “eventual” uma atividade rotineira programada?',
      'Sem o bloqueio e travamento mecânico por cadeado (impedimento de reenergização, NR-10, item 10.5.1), a instalação pode ser considerada liberada e isenta de risco de energização acidental (Anexo 4, item 2, “a”)?',
      'Nas intervenções com o barramento energizado, qual medida de proteção coletiva da NR-10 permanecia ativa?',
      'As medidas de proteção individual atendiam às exigências do item 10.2.9.1 da NR-10 e da NR-6?',
      'Requisite ao(à) [DENOMINACAO_REU] e examine as ordens de serviço, relatórios de manutenção, PGR/LTCAT e o Prontuário das Instalações Elétricas (NR-10, item 10.2.4) do período, reportando a frequência real de cada intervenção.',
      'O(A) [DENOMINACAO_REU] possuía laudo de caracterização ou descaracterização da periculosidade (NR-16, item 16.3) referente ao período? Em caso positivo, requisite-o e informe sua conclusão.',
      'Requisite os procedimentos de trabalho escritos (NR-10, item 10.11.1) aplicáveis às atividades, informando se previam a execução com o equipamento energizado e quais medidas de controle estabeleciam.',
    )}`,
    noText: p('Não há pedido de esclarecimentos complementares.'),
  },
  {
    title: 'Referências',
    level: 1,
    pageBreak: true,
    yesText: list(
      'ul',
      'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. ABNT NBR 16384: segurança em eletricidade: recomendações e orientações para trabalho seguro em serviços com eletricidade. Rio de Janeiro: ABNT, 2020.',
      'BRASIL. Decreto-Lei nº 5.452, de 1º de maio de 1943. Aprova a Consolidação das Leis do Trabalho.',
      'BRASIL. Lei nº 12.740, de 8 de dezembro de 2012. Altera o art. 193 da CLT e revoga a Lei nº 7.369, de 20 de setembro de 1985.',
      'BRASIL. Lei nº 13.105, de 16 de março de 2015. Código de Processo Civil.',
      'BRASIL. Ministério do Trabalho. NR-6: equipamentos de proteção individual.',
      'BRASIL. Ministério do Trabalho. NR-10: segurança em instalações e serviços em eletricidade (redação vigente à época dos fatos).',
      'BRASIL. Ministério do Trabalho. NR-16: atividades e operações perigosas. Anexo 4 aprovado pela Portaria MTE nº 1.078, de 16 de julho de 2014.',
      'BRASIL. Tribunal Superior do Trabalho. Súmulas nº 361 e nº 364.',
      'INSTITUTE OF ELECTRICAL AND ELECTRONICS ENGINEERS. IEEE Std 1584-2018: IEEE guide for performing arc-flash hazard calculations. Nova York: IEEE, 2018.',
      'INTERNATIONAL ELECTROTECHNICAL COMMISSION. IEC TS 60479-1: effects of current on human beings and livestock: part 1: general aspects. Genebra: IEC.',
      'INTERNATIONAL ELECTROTECHNICAL COMMISSION. IEC 61010-1 e IEC 61010-2-030: safety requirements for electrical equipment for measurement, control, and laboratory use. Genebra: IEC.',
    ),
    noText: p('As normas e decisões citadas estão identificadas no próprio texto.'),
  },
  {
    title: 'Encerramento',
    level: 1,
    yesText: p(
      'Respeitosamente, termos em que pede deferimento.',
      '[DATA_EXTENSO].',
      '[PERITO_NOME]<br />Assistente técnico<br />[PERITO_FORMACAO] — [PERITO_REGISTRO]',
    ),
    noText: p('Termos em que pede deferimento.', '[DATA_EXTENSO].', '[PERITO_NOME]<br />[PERITO_REGISTRO]'),
  },
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

// The first of each type is the one "Novo laudo" suggests (REPORT_DEFAULT_TEMPLATES).
export const DEFAULT_TEMPLATES: TemplateRecord[] = [
  {
    id: 'standard-labor-report',
    name: 'Laudo pericial trabalhista',
    type: 'report',
    isDefault: true,
    sections: withIds('trabalhista', LABOR_REPORT),
    layout: { ...REPORT_LAYOUT_DEFAULT, opening: true },
  },
  {
    id: 'standard-report',
    name: 'Laudo pericial (NR-15 e NR-16)',
    type: 'report',
    isDefault: true,
    sections: withIds('laudo', EXPERT_REPORT),
    layout: REPORT_LAYOUT_DEFAULT,
  },
  {
    id: 'standard-technical_opinion',
    name: 'Parecer técnico',
    type: 'technical_opinion',
    isDefault: true,
    sections: withIds('parecer', TECHNICAL_OPINION),
    layout: REPORT_LAYOUT_DEFAULT,
  },
  {
    id: 'standard-technical-objection',
    name: 'Parecer técnico de impugnação',
    type: 'technical_opinion',
    isDefault: true,
    sections: withIds('impugnacao', TECHNICAL_OBJECTION),
    layout: REPORT_LAYOUT_DEFAULT,
  },
];
