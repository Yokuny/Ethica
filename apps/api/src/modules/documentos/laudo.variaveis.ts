import type { Polo, VistoriaDados } from '@ethica/contracts';
import { dateInDisplayTz, timeInDisplayTz } from '@ethica/db';
import type { CompromissoRecord } from '../agenda/compromisso.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import type { PericiaRecord } from '../pericia/pericia.schema.js';
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

const nomes = (pericia: PericiaRecord, polo: Polo, tipo: 'party' | 'lawyer'): string =>
  pericia.partes
    .filter((parte) => parte.polo === polo && parte.tipo === tipo)
    .map((parte) => parte.nome)
    .join(', ');

export type DadosDasVariaveis = {
  pericia: PericiaRecord;
  perito: AccountView;
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
const entre = (partes: Array<string | undefined>): string => partes.filter(Boolean).join(', ');

const qualidade = (valor: VistoriaDados['presentes'][number]['qualidade'], denominacao: Denominacao): string => {
  if (valor === 'plaintiff') return denominacao.plaintiff;
  if (valor === 'defendant') return denominacao.defendant;
  if (valor === 'plaintiff_lawyer') return `advogado(a) do(a) ${denominacao.plaintiff.toLowerCase()}`;
  if (valor === 'defendant_lawyer') return `advogado(a) do(a) ${denominacao.defendant.toLowerCase()}`;
  return rotulo(valor).toLowerCase();
};

const valoresDeCampo = (campo: VistoriaDados, denominacao: Denominacao): ValoresDoLaudo => {
  const paradigmas = (polo: Polo) =>
    juntar(
      campo.paradigmas
        .filter((paradigma) => paradigma.polo === polo)
        .map((p) => {
          const detalhes = entre([p.funcao, p.periodo, p.trabalhouJunto ? 'trabalhou junto' : undefined]);
          return detalhes ? `${p.nome} (${detalhes})` : p.nome;
        }),
    );
  const funcoes = (versao: 'autor' | 'reu') =>
    juntar(
      campo.funcoes.map((funcao) => {
        const periodo = [funcao.anoInicio, funcao.anoFim].filter(Boolean).join(' a ');
        const cabecalho = entre([periodo || undefined, funcao.local]);
        const { atividades, frequencia, tempoExposicao } = funcao[versao];
        const relato = entre([
          atividades,
          frequencia && `frequência: ${frequencia}`,
          tempoExposicao && `exposição: ${tempoExposicao}`,
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
    '[FUNCOES_AUTOR]': funcoes('autor'),
    '[FUNCOES_REU]': funcoes('reu'),
    '[AGENTES_PRESENTES]': agentes('yes'),
    '[AGENTES_AUSENTES]': agentes('no'),
    '[DOCUMENTOS_SOLICITADOS]': juntar(
      campo.documentos.filter((documento) => documento.solicitado).map((documento) => rotulo(documento.documento)),
    ),
  };
};

// Valor de cada marcador de LAUDO_VARIAVEIS; dado ausente fica sem chave e vira pendência.
export const valoresDoLaudo = ({
  pericia,
  perito,
  identity,
  compromissos,
  campo,
  hoje,
}: DadosDasVariaveis): ValoresDoLaudo => {
  const denominacao = DENOMINACAO[pericia.justica];
  const inicioDaVistoria =
    campo?.inicio ??
    compromissos
      .filter((compromisso) => compromisso.tipo === 'inspection' && compromisso.status !== 'canceled')
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())[0]?.inicio;
  const { periodoImprescritoInicio: inicio, periodoImprescritoFim: fim } = pericia;
  return {
    '[NUMERO_PROCESSO]': pericia.numeroProcesso,
    '[TRIBUNAL]': pericia.tribunal,
    '[VARA]': pericia.vara,
    '[COMARCA]': pericia.comarca,
    '[JUSTICA]': rotulo(pericia.justica),
    '[OBJETO]': pericia.objeto,
    '[NOME_AUTOR]': nomes(pericia, 'plaintiff', 'party'),
    '[NOME_REU]': nomes(pericia, 'defendant', 'party'),
    '[DENOMINACAO_AUTOR]': denominacao.plaintiff,
    '[DENOMINACAO_REU]': denominacao.defendant,
    '[ADVOGADOS_AUTOR]': nomes(pericia, 'plaintiff', 'lawyer'),
    '[ADVOGADOS_REU]': nomes(pericia, 'defendant', 'lawyer'),
    '[DATA_NOMEACAO]': dia(pericia.dataNomeacao),
    '[DATA_VISTORIA]': inicioDaVistoria ? dia(dateInDisplayTz(inicioDaVistoria)) : undefined,
    '[HORA_VISTORIA]': inicioDaVistoria ? timeInDisplayTz(inicioDaVistoria) : undefined,
    '[LOCAL_PERICIA]': pericia.localPericia,
    '[FUNCAO_RECLAMANTE]': pericia.funcaoReclamante,
    '[DATA_ADMISSAO]': dia(pericia.dataAdmissao),
    '[DATA_DEMISSAO]': dia(pericia.dataDemissao),
    '[PERIODO_IMPRESCRITO]': inicio && fim ? `${dia(inicio)} a ${dia(fim)}` : undefined,
    '[DATA_EXTENSO]': porExtenso(hoje),
    '[PERITO_NOME]': perito.name,
    '[PERITO_REGISTRO]': perito.registroProfissional,
    '[PERITO_FORMACAO]': perito.formacao,
    '[ESCRITORIO_NOME]': identity.name,
    ...(campo ? valoresDeCampo(campo.dados, denominacao) : {}),
  };
};
