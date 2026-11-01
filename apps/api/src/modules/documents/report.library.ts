import { REPORT_DEFAULT_TEMPLATES, type ReportType } from '@ethica/contracts';
import type { TemplateRecord, TemplateSectionRecord } from './report.schema.js';

// Default library (LAU-05, LAU-06, AD-127): short base text citing the standard, in the variants
// "yes" and "no", for the expert to review and complete. Text in parentheses is what they
// fill in. Applies to every tenant, read-only; the office clones it to adapt (AD-126).

const p = (...paragraphs: string[]): string => paragraphs.map((text) => `<p>${text}</p>`).join('');

type Section = Omit<TemplateSectionRecord, 'id' | 'titleOnly' | 'pageBreak'> &
  Partial<Pick<TemplateSectionRecord, 'titleOnly' | 'pageBreak'>>;

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

const TECHNICAL_OPINION: Section[] = [
  IDENTIFICATION,
  {
    title: 'Objetivo',
    level: 1,
    yesText: p(
      'O presente parecer técnico, elaborado pelo assistente técnico indicado pela parte (indicar), tem por objetivo analisar o laudo pericial e apresentar as conclusões técnicas sobre a matéria.',
    ),
    noText: p(
      'O presente parecer técnico, elaborado pelo assistente técnico indicado pela parte (indicar), complementa os pontos técnicos não abordados no laudo pericial.',
    ),
  },
  {
    title: 'Acompanhamento da vistoria',
    level: 1,
    yesText: p(
      'O assistente técnico acompanhou a vistoria realizada pelo perito do Juízo em [DATA_VISTORIA], no local periciado ([LOCAL_PERICIA]).',
    ),
    noText: p('O assistente técnico não acompanhou a vistoria (informar o motivo).'),
  },
  {
    title: 'Medições de agentes quantitativos',
    level: 1,
    yesText: `${p('As medições abaixo foram realizadas em conjunto com o perito do Juízo, nos mesmos pontos e condições:')}<table><tbody><tr><th>Agente</th><th>Instrumento</th><th>Resultado do perito</th><th>Resultado do assistente</th><th>Limite de tolerância</th></tr><tr><td>(agente)</td><td>(instrumento)</td><td>(valor)</td><td>(valor)</td><td>(limite)</td></tr></tbody></table>`,
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
    title: 'Conclusão',
    level: 1,
    pageBreak: true,
    yesText: p('Pelo exposto, o assistente técnico conclui que (descrever a conclusão técnica).'),
    noText: p('Pelo exposto, o assistente técnico ratifica as conclusões do laudo pericial.'),
  },
  ENCERRAMENTO,
];

const comIds = (prefix: string, sections: Section[]): TemplateSectionRecord[] =>
  sections.map((section, index) => ({
    titleOnly: false,
    pageBreak: false,
    ...section,
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
  }));

export const DEFAULT_TEMPLATES: Record<ReportType, TemplateRecord> = {
  report: {
    id: REPORT_DEFAULT_TEMPLATES.report,
    name: 'Laudo pericial trabalhista',
    type: 'report',
    isDefault: true,
    sections: comIds('laudo', EXPERT_REPORT),
  },
  technical_opinion: {
    id: REPORT_DEFAULT_TEMPLATES.technical_opinion,
    name: 'Parecer técnico',
    type: 'technical_opinion',
    isDefault: true,
    sections: comIds('parecer', TECHNICAL_OPINION),
  },
};
