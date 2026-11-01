import type { Side, VistoriaDados } from '@ethica/contracts';
import { dateInDisplayTz, timeInDisplayTz } from '@ethica/db';
import type { CompromissoRecord } from '../agenda/compromisso.schema.js';
import type { CaseRecord } from '../case/case.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import { dia, rotulo } from './documento.layout.js';
import type { ValoresDoLaudo } from './laudo.html.js';

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const porExtenso = (data: string): string => {
  const [ano, mes, d] = data.split('-');
  return `${Number(d)} de ${MESES[Number(mes) - 1]} de ${ano}`;
};

// Denominação das partes pela justiça (LAU-06): trabalhista reclamante/reclamada; cível e
// federal autor/réu. A lógica e os entregáveis são os mesmos.
const DENOMINACAO = {
  labor: { plaintiff: 'Reclamante', defendant: 'Reclamada' },
  civil: { plaintiff: 'Autor', defendant: 'Réu' },
  federal: { plaintiff: 'Autor', defendant: 'Réu' },
} as const;

const nomes = (legalCase: CaseRecord, side: Side, tipo: 'party' | 'lawyer'): string =>
  legalCase.parties
    .filter((party) => party.side === side && party.tipo === tipo)
    .map((party) => party.nome)
    .join(', ');

export type DadosDasVariaveis = {
  legalCase: CaseRecord;
  expert: AccountView;
  identity: DocumentIdentity;
  compromissos: CompromissoRecord[];
  // Última vistoria feita com registro (AD-130): os dados e o início. Sem ela, as variáveis de
  // campo ficam pendentes e data/hora vêm da vistoria mais recente não cancelada.
  campo?: { dados: VistoriaDados; inicio: Date };
  hoje: string;
};

type Denominacao = (typeof DENOMINACAO)[keyof typeof DENOMINACAO];

// Lista de campo em texto corrido; vazia com vistoria registrada vira "nenhum" (não pendência).
const juntar = (itens: string[]): string => (itens.length ? itens.join('; ') : 'nenhum');
const entre = (parties: Array<string | undefined>): string => parties.filter(Boolean).join(', ');

const qualidade = (valor: VistoriaDados['presentes'][number]['qualidade'], denominacao: Denominacao): string => {
  if (valor === 'plaintiff') return denominacao.plaintiff;
  if (valor === 'defendant') return denominacao.defendant;
  if (valor === 'plaintiff_lawyer') return `advogado(a) do(a) ${denominacao.plaintiff.toLowerCase()}`;
  if (valor === 'defendant_lawyer') return `advogado(a) do(a) ${denominacao.defendant.toLowerCase()}`;
  return rotulo(valor).toLowerCase();
};

const valoresDeCampo = (campo: VistoriaDados, denominacao: Denominacao): ValoresDoLaudo => {
  const paradigmas = (side: Side) =>
    juntar(
      campo.paradigmas
        .filter((paradigma) => paradigma.side === side)
        .map((p) => {
          const detalhes = entre([p.funcao, p.periodo, p.trabalhouJunto ? 'trabalhou junto' : undefined]);
          return detalhes ? `${p.nome} (${detalhes})` : p.nome;
        }),
    );
  const funcoes = (versao: 'plaintiff' | 'defendant') =>
    juntar(
      campo.funcoes.map((funcao) => {
        const periodo = [funcao.anoInicio, funcao.anoFim].filter(Boolean).join(' a ');
        const cabecalho = entre([periodo || undefined, funcao.local]);
        const { atividades, frequencia, timeExposure } = funcao[versao];
        const relato = entre([
          atividades,
          frequencia && `frequência: ${frequencia}`,
          timeExposure && `exposição: ${timeExposure}`,
        ]);
        return `${funcao.titulo}${cabecalho ? ` (${cabecalho})` : ''}: ${relato || 'sem relato'}`;
      }),
    );
  const agentes = (presente: 'yes' | 'no') =>
    juntar(
      campo.agentes
        .filter((agente) => agente.presente === presente)
        .map((agente) => {
          const detalhes = entre([agente.epi && `EPI: ${agente.epi}`, agente.observacoes]);
          return detalhes ? `${rotulo(agente.agente)} (${detalhes})` : rotulo(agente.agente);
        }),
    );
  return {
    '[PRESENTES_VISTORIA]': juntar(
      campo.presentes.map((presente) => `${presente.nome} (${qualidade(presente.qualidade, denominacao)})`),
    ),
    '[PARADIGMAS_AUTOR]': paradigmas('plaintiff'),
    '[PARADIGMAS_REU]': paradigmas('defendant'),
    '[FUNCOES_AUTOR]': funcoes('plaintiff'),
    '[FUNCOES_REU]': funcoes('defendant'),
    '[AGENTES_PRESENTES]': agentes('yes'),
    '[AGENTES_AUSENTES]': agentes('no'),
    '[DOCUMENTOS_SOLICITADOS]': juntar(
      campo.documentos.filter((documento) => documento.solicitado).map((documento) => rotulo(documento.documento)),
    ),
  };
};

// Valor de cada marcador de LAUDO_VARIAVEIS; dado ausente fica sem chave e vira pendência.
export const valoresDoLaudo = ({
  legalCase,
  expert,
  identity,
  compromissos,
  campo,
  hoje,
}: DadosDasVariaveis): ValoresDoLaudo => {
  const denominacao = DENOMINACAO[legalCase.courtType];
  const inicioDaVistoria =
    campo?.inicio ??
    compromissos
      .filter((compromisso) => compromisso.tipo === 'inspection' && compromisso.status !== 'canceled')
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())[0]?.inicio;
  const { nonPrescribedPeriodStart: inicio, nonPrescribedPeriodEnd: fim } = legalCase;
  return {
    '[NUMERO_PROCESSO]': legalCase.processNumber,
    '[TRIBUNAL]': legalCase.court,
    '[VARA]': legalCase.division,
    '[COMARCA]': legalCase.district,
    '[JUSTICA]': rotulo(legalCase.courtType),
    '[OBJETO]': legalCase.subject,
    '[NOME_AUTOR]': nomes(legalCase, 'plaintiff', 'party'),
    '[NOME_REU]': nomes(legalCase, 'defendant', 'party'),
    '[DENOMINACAO_AUTOR]': denominacao.plaintiff,
    '[DENOMINACAO_REU]': denominacao.defendant,
    '[ADVOGADOS_AUTOR]': nomes(legalCase, 'plaintiff', 'lawyer'),
    '[ADVOGADOS_REU]': nomes(legalCase, 'defendant', 'lawyer'),
    '[DATA_NOMEACAO]': dia(legalCase.nominationDate),
    '[DATA_VISTORIA]': inicioDaVistoria ? dia(dateInDisplayTz(inicioDaVistoria)) : undefined,
    '[HORA_VISTORIA]': inicioDaVistoria ? timeInDisplayTz(inicioDaVistoria) : undefined,
    '[LOCAL_PERICIA]': legalCase.location,
    '[FUNCAO_RECLAMANTE]': legalCase.claimantJob,
    '[DATA_ADMISSAO]': dia(legalCase.hireDate),
    '[DATA_DEMISSAO]': dia(legalCase.terminationDate),
    '[PERIODO_IMPRESCRITO]': inicio && fim ? `${dia(inicio)} a ${dia(fim)}` : undefined,
    '[DATA_EXTENSO]': porExtenso(hoje),
    '[PERITO_NOME]': expert.name,
    '[PERITO_REGISTRO]': expert.registroProfissional,
    '[PERITO_FORMACAO]': expert.formacao,
    '[ESCRITORIO_NOME]': identity.name,
    ...(campo ? valoresDeCampo(campo.dados, denominacao) : {}),
  };
};
