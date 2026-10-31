import type { Polo } from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
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
  hoje: string;
};

// Valor de cada marcador de LAUDO_VARIAVEIS; dado ausente fica sem chave e vira pendência.
export const valoresDoLaudo = ({
  pericia,
  perito,
  identity,
  compromissos,
  hoje,
}: DadosDasVariaveis): ValoresDoLaudo => {
  const denominacao = DENOMINACAO[pericia.justica];
  const vistoria = compromissos
    .filter((compromisso) => compromisso.tipo === 'inspection' && compromisso.status !== 'canceled')
    .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())[0];
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
    '[DATA_VISTORIA]': vistoria ? dia(dateInDisplayTz(vistoria.inicio)) : undefined,
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
  };
};
