import type { InspectionData, Side } from '@ethica/contracts';
import { dateInDisplayTz, timeInDisplayTz } from '@ethica/db';
import type { AppointmentRecord } from '../agenda/appointment.schema.js';
import type { CaseRecord } from '../case/case.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import { day, rotulo } from './documento.layout.js';
import type { ReportValues } from './laudo.html.js';

const MONTHS = [
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

const byWords = (data: string): string => {
  const [year, month, d] = data.split('-');
  return `${Number(d)} de ${MONTHS[Number(month) - 1]} de ${year}`;
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
  appointments: AppointmentRecord[];
  // Última vistoria feita com registro (AD-130): os dados e o início. Sem ela, as variáveis de
  // campo ficam pendentes e data/hora vêm da vistoria mais recente não cancelada.
  field?: { dados: InspectionData; inicio: Date };
  today: string;
};

type Denominacao = (typeof DENOMINACAO)[keyof typeof DENOMINACAO];

// Lista de campo em texto corrido; vazia com vistoria registrada vira "nenhum" (não pendência).
const juntar = (itens: string[]): string => (itens.length ? itens.join('; ') : 'nenhum');
const entre = (parties: Array<string | undefined>): string => parties.filter(Boolean).join(', ');

const capacity = (amount: InspectionData['attendees'][number]['capacity'], denominacao: Denominacao): string => {
  if (amount === 'plaintiff') return denominacao.plaintiff;
  if (amount === 'defendant') return denominacao.defendant;
  if (amount === 'plaintiff_lawyer') return `advogado(a) do(a) ${denominacao.plaintiff.toLowerCase()}`;
  if (amount === 'defendant_lawyer') return `advogado(a) do(a) ${denominacao.defendant.toLowerCase()}`;
  return rotulo(amount).toLowerCase();
};

const fieldValues = (field: InspectionData, denominacao: Denominacao): ReportValues => {
  const comparators = (side: Side) =>
    juntar(
      field.comparators
        .filter((comparator) => comparator.side === side)
        .map((p) => {
          const detalhes = entre([p.job, p.period, p.workedTogether ? 'trabalhou junto' : undefined]);
          return detalhes ? `${p.nome} (${detalhes})` : p.nome;
        }),
    );
  const jobs = (versao: 'plaintiff' | 'defendant') =>
    juntar(
      field.jobs.map((job) => {
        const period = [job.yearStart, job.yearEnd].filter(Boolean).join(' a ');
        const cabecalho = entre([period || undefined, job.local]);
        const { atividades, frequency, timeExposure } = job[versao];
        const statement = entre([
          atividades,
          frequency && `frequência: ${frequency}`,
          timeExposure && `exposição: ${timeExposure}`,
        ]);
        return `${job.titulo}${cabecalho ? ` (${cabecalho})` : ''}: ${statement || 'sem relato'}`;
      }),
    );
  const agents = (present: 'yes' | 'no') =>
    juntar(
      field.agents
        .filter((agent) => agent.present === present)
        .map((agent) => {
          const detalhes = entre([agent.ppe && `EPI: ${agent.ppe}`, agent.observacoes]);
          return detalhes ? `${rotulo(agent.agent)} (${detalhes})` : rotulo(agent.agent);
        }),
    );
  return {
    '[PRESENTES_VISTORIA]': juntar(
      field.attendees.map((attendee) => `${attendee.nome} (${capacity(attendee.capacity, denominacao)})`),
    ),
    '[PARADIGMAS_AUTOR]': comparators('plaintiff'),
    '[PARADIGMAS_REU]': comparators('defendant'),
    '[FUNCOES_AUTOR]': jobs('plaintiff'),
    '[FUNCOES_REU]': jobs('defendant'),
    '[AGENTES_PRESENTES]': agents('yes'),
    '[AGENTES_AUSENTES]': agents('no'),
    '[DOCUMENTOS_SOLICITADOS]': juntar(
      field.documentos.filter((documento) => documento.requested).map((documento) => rotulo(documento.documento)),
    ),
  };
};

// Valor de cada marcador de LAUDO_VARIAVEIS; dado ausente fica sem chave e vira pendência.
export const reportValues = ({
  legalCase,
  expert,
  identity,
  appointments,
  field,
  today,
}: DadosDasVariaveis): ReportValues => {
  const denominacao = DENOMINACAO[legalCase.courtType];
  const inspectionStart =
    field?.inicio ??
    appointments
      .filter((appointment) => appointment.tipo === 'inspection' && appointment.status !== 'canceled')
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
    '[DATA_NOMEACAO]': day(legalCase.nominationDate),
    '[DATA_VISTORIA]': inspectionStart ? day(dateInDisplayTz(inspectionStart)) : undefined,
    '[HORA_VISTORIA]': inspectionStart ? timeInDisplayTz(inspectionStart) : undefined,
    '[LOCAL_PERICIA]': legalCase.location,
    '[FUNCAO_RECLAMANTE]': legalCase.claimantJob,
    '[DATA_ADMISSAO]': day(legalCase.hireDate),
    '[DATA_DEMISSAO]': day(legalCase.terminationDate),
    '[PERIODO_IMPRESCRITO]': inicio && fim ? `${day(inicio)} a ${day(fim)}` : undefined,
    '[DATA_EXTENSO]': byWords(today),
    '[PERITO_NOME]': expert.name,
    '[PERITO_REGISTRO]': expert.registroProfissional,
    '[PERITO_FORMACAO]': expert.formacao,
    '[ESCRITORIO_NOME]': identity.name,
    ...(field ? fieldValues(field.dados, denominacao) : {}),
  };
};
