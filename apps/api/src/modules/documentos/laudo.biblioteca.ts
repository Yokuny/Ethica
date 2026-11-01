import { LAUDO_MODELOS_PADRAO, type LaudoTipo } from '@ethica/contracts';
import type { ModeloLaudoRecord, ModeloSecaoRecord } from './laudo.schema.js';

// Biblioteca padrão (LAU-05, LAU-06, AD-127): texto-base curto citando a norma, nas variantes
// "sim" e "não", para o perito revisar e completar. Trecho entre parênteses é o que ele
// preenche. Vale para todo tenant, só leitura; o escritório clona para adaptar (AD-126).

const p = (...paragrafos: string[]): string => paragrafos.map((texto) => `<p>${texto}</p>`).join('');

type Secao = Omit<ModeloSecaoRecord, 'id' | 'apenasTitulo' | 'quebraPagina'> &
  Partial<Pick<ModeloSecaoRecord, 'apenasTitulo' | 'quebraPagina'>>;

const grupo = (titulo: string, quebraPagina = false): Secao => ({
  titulo,
  nivel: 1,
  apenasTitulo: true,
  quebraPagina,
  textoSim: '',
  textoNao: '',
});

const IDENTIFICACAO: Secao = {
  titulo: 'Identificação do processo',
  nivel: 1,
  textoSim: p(
    'Processo nº [NUMERO_PROCESSO], em trâmite na [VARA] ([TRIBUNAL]).',
    '[DENOMINACAO_AUTOR]: [NOME_AUTOR]',
    '[DENOMINACAO_REU]: [NOME_REU]',
    'Objeto: [OBJETO].',
  ),
  textoNao: p(
    'Processo nº [NUMERO_PROCESSO], em trâmite na [VARA] ([TRIBUNAL]).',
    '[DENOMINACAO_AUTOR]: [NOME_AUTOR]',
    '[DENOMINACAO_REU]: [NOME_REU]',
  ),
};

const ENCERRAMENTO: Secao = {
  titulo: 'Encerramento',
  nivel: 1,
  textoSim: p(
    'Nada mais havendo a esclarecer, encerra-se o presente documento, colocando-se o signatário à disposição do Juízo para os esclarecimentos que se fizerem necessários.',
    '[DATA_EXTENSO].',
    '[PERITO_NOME]<br />[PERITO_FORMACAO] — [PERITO_REGISTRO]',
  ),
  textoNao: p('Encerra-se o presente documento.', '[DATA_EXTENSO].', '[PERITO_NOME]<br />[PERITO_REGISTRO]'),
};

// NR-15: um anexo por agente. Grau do adicional conforme o item 15.2 da NR-15.
const anexo = (numero: string, agent: string, sim: string, nao: string): Secao => ({
  titulo: `Anexo ${numero} — ${agent}`,
  nivel: 2,
  textoSim: p(sim),
  textoNao: p(nao),
});

const NR15: Secao[] = [
  grupo('Insalubridade — NR-15', true),
  anexo(
    '1',
    'Ruído contínuo ou intermitente',
    'A avaliação por dosimetria (equipamento, data e jornada avaliada) indicou nível de exposição acima do limite de tolerância do Quadro do Anexo 1 da NR-15 (85 dB(A) para 8 horas diárias), sem neutralização por protetor auricular eficaz. Caracteriza insalubridade em grau médio.',
    'A avaliação por dosimetria (equipamento, data e jornada avaliada) indicou nível de exposição abaixo do limite de tolerância do Quadro do Anexo 1 da NR-15, ou a exposição foi neutralizada por protetor auricular eficaz. Não caracteriza insalubridade pelo Anexo 1.',
  ),
  anexo(
    '2',
    'Ruído de impacto',
    'Os níveis de pico medidos superaram o limite de tolerância do Anexo 2 da NR-15 (130 dB linear ou 120 dB(C) em resposta rápida). Caracteriza insalubridade em grau médio.',
    'Não há exposição a ruído de impacto acima do limite de tolerância do Anexo 2 da NR-15.',
  ),
  anexo(
    '3',
    'Calor',
    'A avaliação do IBUTG (equipamento, local e taxa metabólica da atividade) indicou exposição acima do limite de tolerância do Anexo 3 da NR-15. Caracteriza insalubridade em grau médio.',
    'A avaliação do IBUTG indicou exposição dentro do limite de tolerância do Anexo 3 da NR-15, ou não há fonte de calor relevante no posto de trabalho.',
  ),
  anexo(
    '4',
    'Iluminação',
    'O Anexo 4 da NR-15 foi revogado pela Portaria MTPS nº 3.751/1990; as condições de iluminação são registradas apenas como informação (NR-17).',
    'O Anexo 4 da NR-15 foi revogado pela Portaria MTPS nº 3.751/1990; iluminação não enseja adicional de insalubridade.',
  ),
  anexo(
    '5',
    'Radiações ionizantes',
    'Há exposição a radiações ionizantes acima dos limites fixados pela Comissão Nacional de Energia Nuclear (CNEN), conforme o Anexo 5 da NR-15. Caracteriza insalubridade em grau máximo.',
    'Não há exposição a fontes de radiação ionizante no posto de trabalho.',
  ),
  anexo(
    '6',
    'Trabalho sob condições hiperbáricas',
    'As atividades eram realizadas sob ar comprimido ou em mergulho, nas condições do Anexo 6 da NR-15. Caracteriza insalubridade em grau máximo.',
    'Não há trabalho sob condições hiperbáricas.',
  ),
  anexo(
    '7',
    'Radiações não ionizantes',
    'Há exposição sem proteção adequada a radiações não ionizantes (micro-ondas, ultravioleta ou laser), avaliada qualitativamente conforme o Anexo 7 da NR-15. Caracteriza insalubridade em grau médio.',
    'Não há exposição a radiações não ionizantes, ou a proteção fornecida foi adequada.',
  ),
  anexo(
    '8',
    'Vibrações',
    'A avaliação (equipamento e método) indicou aceleração resultante de exposição normalizada acima do limite do Anexo 8 da NR-15 (mãos e braços: 5 m/s²; corpo inteiro: 1,1 m/s² ou VDVR de 21 m/s¹,⁷⁵). Caracteriza insalubridade em grau médio.',
    'A exposição a vibrações ficou abaixo dos limites do Anexo 8 da NR-15, ou não há fonte de vibração relevante.',
  ),
  anexo(
    '9',
    'Frio',
    'As atividades eram exercidas no interior de câmaras frigoríficas ou locais com condições similares, sem proteção adequada, conforme o Anexo 9 da NR-15. Caracteriza insalubridade em grau médio.',
    'Não há exposição ao frio nas condições do Anexo 9 da NR-15, ou a proteção fornecida foi adequada.',
  ),
  anexo(
    '10',
    'Umidade',
    'As atividades eram exercidas em locais alagados ou encharcados, com umidade excessiva capaz de produzir danos à saúde, conforme o Anexo 10 da NR-15. Caracteriza insalubridade em grau médio.',
    'Não há exposição a umidade excessiva nas condições do Anexo 10 da NR-15.',
  ),
  anexo(
    '11',
    'Agentes químicos com limite de tolerância',
    'A avaliação quantitativa (agente, método de coleta e laboratório) indicou concentração acima do limite de tolerância do Quadro 1 do Anexo 11 da NR-15. Caracteriza insalubridade no grau indicado para o agente (mínimo, médio ou máximo).',
    'A avaliação quantitativa indicou concentração abaixo do limite de tolerância do Quadro 1 do Anexo 11 da NR-15, ou não há exposição a esses agentes.',
  ),
  anexo(
    '12',
    'Poeiras minerais',
    'Há exposição a poeiras minerais (asbesto, manganês ou sílica livre cristalizada) acima dos limites do Anexo 12 da NR-15. Caracteriza insalubridade em grau máximo.',
    'Não há exposição a poeiras minerais acima dos limites do Anexo 12 da NR-15.',
  ),
  anexo(
    '13',
    'Agentes químicos (avaliação qualitativa)',
    'As atividades envolviam contato com agentes relacionados no Anexo 13 da NR-15 (identificar a atividade e o agente, por exemplo hidrocarbonetos e outros compostos de carbono), sem proteção eficaz. Caracteriza insalubridade no grau indicado para a atividade. Para benzeno, observar o Anexo 13-A.',
    'As atividades não envolviam contato com os agentes relacionados no Anexo 13 da NR-15, ou a proteção fornecida foi eficaz.',
  ),
  anexo(
    '14',
    'Agentes biológicos',
    'As atividades envolviam contato permanente com agentes biológicos nas situações do Anexo 14 da NR-15 (identificar: pacientes em isolamento, lixo urbano, estabelecimentos de saúde etc.). Caracteriza insalubridade em grau (médio ou máximo, conforme a situação).',
    'As atividades não envolviam contato permanente com agentes biológicos nas situações do Anexo 14 da NR-15.',
  ),
];

// NR-16: adicional de 30% sobre o salário-base (art. 193 da CLT).
const hazardousConditions = (titulo: string, sim: string, nao: string): Secao => ({
  titulo,
  nivel: 2,
  textoSim: p(`${sim} Caracteriza periculosidade, com adicional de 30% (art. 193 da CLT).`),
  textoNao: p(nao),
});

const NR16: Secao[] = [
  grupo('Periculosidade — NR-16', true),
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

const questions = (de: string): Secao => ({
  titulo: `Quesitos ${de}`,
  nivel: 2,
  textoSim: p('Quesito 1: (transcrever o quesito).', 'Resposta: (responder).'),
  textoNao: p(`Não foram apresentados quesitos ${de}.`),
});

const EXPERT_REPORT: Secao[] = [
  IDENTIFICACAO,
  {
    titulo: 'Objetivo',
    nivel: 1,
    textoSim: p(
      'O presente laudo tem por objetivo verificar se as atividades exercidas por [NOME_AUTOR], na função de [FUNCAO_RECLAMANTE], no período de [PERIODO_IMPRESCRITO], foram executadas em condições insalubres ou perigosas, nos termos dos arts. 189 a 197 da CLT e das Normas Regulamentadoras NR-15 e NR-16.',
    ),
    textoNao: p(
      'O presente laudo tem por objetivo responder aos quesitos e esclarecer os pontos técnicos fixados pelo Juízo.',
    ),
  },
  {
    titulo: 'Metodologia e vistoria',
    nivel: 1,
    textoSim: p(
      'A vistoria foi realizada em [DATA_VISTORIA], no local periciado ([LOCAL_PERICIA]), com início às [HORA_VISTORIA]. Foram feitas entrevistas, inspeção dos postos de trabalho, análise dos documentos dos autos (PGR, PCMSO, LTCAT, fichas de entrega de EPI) e, quando cabível, avaliações quantitativas com instrumentos calibrados.',
      'Estiveram presentes: [PRESENTES_VISTORIA].',
      'Foram solicitados às partes: [DOCUMENTOS_SOLICITADOS].',
    ),
    textoNao: p(
      'A vistoria não pôde ser realizada no local de trabalho (informar o motivo). A análise foi feita com base nos documentos dos autos e nas informações prestadas pelas partes.',
    ),
  },
  {
    titulo: 'Atividades exercidas',
    nivel: 1,
    textoSim: p(
      'Segundo as informações colhidas na vistoria, confirmadas pelas partes, o trabalhador exercia a função de [FUNCAO_RECLAMANTE], com as seguintes atividades: [FUNCOES_AUTOR].',
      'Paradigmas indicados pelo(a) [DENOMINACAO_AUTOR]: [PARADIGMAS_AUTOR].',
    ),
    textoNao: p(
      'As partes divergiram quanto às atividades exercidas.',
      'Versão do(a) [DENOMINACAO_AUTOR]: [FUNCOES_AUTOR]. Paradigmas indicados: [PARADIGMAS_AUTOR].',
      'Versão do(a) [DENOMINACAO_REU]: [FUNCOES_REU]. Paradigmas indicados: [PARADIGMAS_REU].',
    ),
  },
  {
    titulo: 'Equipamentos de proteção individual',
    nivel: 1,
    textoSim: p(
      'Houve fornecimento de EPI com Certificado de Aprovação válido, comprovado por fichas assinadas, com treinamento e fiscalização do uso (NR-6), suficientes para neutralizar o agente (Súmula 80 do TST).',
    ),
    textoNao: p(
      'Não houve comprovação de fornecimento regular de EPI com Certificado de Aprovação válido, de treinamento ou de fiscalização do uso (NR-6); a entrega, quando houve, não neutralizou o agente (Súmula 289 do TST).',
    ),
  },
  ...NR15,
  ...NR16,
  grupo('Quesitos', true),
  questions('pelo(a) [DENOMINACAO_AUTOR]'),
  questions('pelo(a) [DENOMINACAO_REU]'),
  questions('pelo Juízo'),
  {
    titulo: 'Conclusão',
    nivel: 1,
    quebraPagina: true,
    textoSim: p(
      'Com base na vistoria, nas avaliações e nos documentos dos autos, conclui-se que as atividades de [NOME_AUTOR], no período de [PERIODO_IMPRESCRITO], foram exercidas em condições (insalubres em grau ___, nos termos do Anexo ___ da NR-15 / perigosas, nos termos do Anexo ___ da NR-16).',
    ),
    textoNao: p(
      'Com base na vistoria, nas avaliações e nos documentos dos autos, conclui-se que as atividades de [NOME_AUTOR], no período de [PERIODO_IMPRESCRITO], não foram exercidas em condições insalubres nem perigosas, nos termos da NR-15 e da NR-16.',
    ),
  },
  {
    titulo: 'Honorários periciais',
    nivel: 1,
    textoSim: p(
      'Requer o arbitramento dos honorários periciais em R$ (valor), considerando a complexidade da matéria e o tempo dedicado à vistoria, às avaliações e à elaboração deste laudo.',
    ),
    textoNao: p(
      'Os honorários periciais já foram fixados pelo Juízo; requer a sua liberação após a entrega deste laudo.',
    ),
  },
  ENCERRAMENTO,
];

const TECHNICAL_OPINION: Secao[] = [
  IDENTIFICACAO,
  {
    titulo: 'Objetivo',
    nivel: 1,
    textoSim: p(
      'O presente parecer técnico, elaborado pelo assistente técnico indicado pela parte (indicar), tem por objetivo analisar o laudo pericial e apresentar as conclusões técnicas sobre a matéria.',
    ),
    textoNao: p(
      'O presente parecer técnico, elaborado pelo assistente técnico indicado pela parte (indicar), complementa os pontos técnicos não abordados no laudo pericial.',
    ),
  },
  {
    titulo: 'Acompanhamento da vistoria',
    nivel: 1,
    textoSim: p(
      'O assistente técnico acompanhou a vistoria realizada pelo perito do Juízo em [DATA_VISTORIA], no local periciado ([LOCAL_PERICIA]).',
    ),
    textoNao: p('O assistente técnico não acompanhou a vistoria (informar o motivo).'),
  },
  {
    titulo: 'Medições de agentes quantitativos',
    nivel: 1,
    textoSim: `${p('As medições abaixo foram realizadas em conjunto com o perito do Juízo, nos mesmos pontos e condições:')}<table><tbody><tr><th>Agente</th><th>Instrumento</th><th>Resultado do perito</th><th>Resultado do assistente</th><th>Limite de tolerância</th></tr><tr><td>(agente)</td><td>(instrumento)</td><td>(valor)</td><td>(valor)</td><td>(limite)</td></tr></tbody></table>`,
    textoNao: p('Não foram realizadas medições de agentes quantitativos em conjunto com o perito do Juízo.'),
  },
  {
    titulo: 'Análise do laudo pericial',
    nivel: 1,
    textoSim: p(
      'O assistente técnico concorda com a metodologia e as conclusões do laudo pericial, pelos seguintes fundamentos: (descrever).',
    ),
    textoNao: p(
      'O assistente técnico diverge da metodologia ou das conclusões do laudo pericial nos seguintes pontos: (descrever).',
    ),
  },
  {
    titulo: 'Impugnação do laudo pericial',
    nivel: 1,
    textoSim: p('Impugna-se o laudo pericial pelos seguintes fundamentos técnicos: (descrever).'),
    textoNao: p('Não há impugnação ao laudo pericial.'),
  },
  {
    titulo: 'Quesitos complementares',
    nivel: 1,
    textoSim: p('Quesito complementar 1: (transcrever).', 'Justificativa técnica: (descrever).'),
    textoNao: p('Não há quesitos complementares.'),
  },
  {
    titulo: 'Quesitos suplementares',
    nivel: 1,
    textoSim: p('Quesito suplementar 1: (transcrever).', 'Justificativa técnica: (descrever).'),
    textoNao: p('Não há quesitos suplementares.'),
  },
  {
    titulo: 'Conclusão',
    nivel: 1,
    quebraPagina: true,
    textoSim: p('Pelo exposto, o assistente técnico conclui que (descrever a conclusão técnica).'),
    textoNao: p('Pelo exposto, o assistente técnico ratifica as conclusões do laudo pericial.'),
  },
  ENCERRAMENTO,
];

const comIds = (prefixo: string, secoes: Secao[]): ModeloSecaoRecord[] =>
  secoes.map((secao, indice) => ({
    apenasTitulo: false,
    quebraPagina: false,
    ...secao,
    id: `${prefixo}-${String(indice + 1).padStart(2, '0')}`,
  }));

export const MODELOS_PADRAO: Record<LaudoTipo, ModeloLaudoRecord> = {
  report: {
    id: LAUDO_MODELOS_PADRAO.report,
    nome: 'Laudo pericial trabalhista',
    tipo: 'report',
    padrao: true,
    secoes: comIds('laudo', EXPERT_REPORT),
  },
  technical_opinion: {
    id: LAUDO_MODELOS_PADRAO.technical_opinion,
    nome: 'Parecer técnico',
    tipo: 'technical_opinion',
    padrao: true,
    secoes: comIds('parecer', TECHNICAL_OPINION),
  },
};
