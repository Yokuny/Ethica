import type { InspectionData, Side } from '@ethica/contracts';
import { dateInDisplayTz, timeInDisplayTz } from '@ethica/db';
import type { AppointmentRecord } from '../agenda/appointment.schema.js';
import type { CaseRecord } from '../case/case.schema.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import { day, label } from './document.layout.js';
import type { ReportValues } from './report.html.js';

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
const NAME = {
  labor: { plaintiff: 'Reclamante', defendant: 'Reclamada' },
  civil: { plaintiff: 'Autor', defendant: 'Réu' },
  federal: { plaintiff: 'Autor', defendant: 'Réu' },
} as const;

const names = (legalCase: CaseRecord, side: Side, type: 'party' | 'lawyer'): string =>
  legalCase.parties
    .filter((party) => party.side === side && party.type === type)
    .map((party) => party.name)
    .join(', ');

export type VariablesData = {
  legalCase: CaseRecord;
  expert: AccountView;
  identity: DocumentIdentity;
  appointments: AppointmentRecord[];
  // Última vistoria feita com registro (AD-130): os dados e o início. Sem ela, as variáveis de
  // campo ficam pendentes e data/hora vêm da vistoria mais recente não cancelada.
  field?: { data: InspectionData; start: Date };
  today: string;
};

type Name = (typeof NAME)[keyof typeof NAME];

// Lista de campo em texto corrido; vazia com vistoria registrada vira "nenhum" (não pendência).
const juntar = (items: string[]): string => (items.length ? items.join('; ') : 'none');
const entre = (parties: Array<string | undefined>): string => parties.filter(Boolean).join(', ');

const capacity = (amount: InspectionData['attendees'][number]['capacity'], name: Name): string => {
  if (amount === 'plaintiff') return name.plaintiff;
  if (amount === 'defendant') return name.defendant;
  if (amount === 'plaintiff_lawyer') return `advogado(a) do(a) ${name.plaintiff.toLowerCase()}`;
  if (amount === 'defendant_lawyer') return `advogado(a) do(a) ${name.defendant.toLowerCase()}`;
  return label(amount).toLowerCase();
};

const fieldValues = (field: InspectionData, name: Name): ReportValues => {
  const comparators = (side: Side) =>
    juntar(
      field.comparators
        .filter((comparator) => comparator.side === side)
        .map((p) => {
          const details = entre([p.job, p.period, p.workedTogether ? 'trabalhou junto' : undefined]);
          return details ? `${p.name} (${details})` : p.name;
        }),
    );
  const jobs = (version: 'plaintiff' | 'defendant') =>
    juntar(
      field.jobs.map((job) => {
        const period = [job.yearStart, job.yearEnd].filter(Boolean).join(' a ');
        const header = entre([period || undefined, job.location]);
        const { activities, frequency, timeExposure } = job[version];
        const statement = entre([
          activities,
          frequency && `frequência: ${frequency}`,
          timeExposure && `exposição: ${timeExposure}`,
        ]);
        return `${job.title}${header ? ` (${header})` : ''}: ${statement || 'sem relato'}`;
      }),
    );
  const agents = (present: 'yes' | 'no') =>
    juntar(
      field.agents
        .filter((agent) => agent.present === present)
        .map((agent) => {
          const details = entre([agent.ppe && `EPI: ${agent.ppe}`, agent.notes]);
          return details ? `${label(agent.agent)} (${details})` : label(agent.agent);
        }),
    );
  return {
    '[PRESENTES_VISTORIA]': juntar(
      field.attendees.map((attendee) => `${attendee.name} (${capacity(attendee.capacity, name)})`),
    ),
    '[PARADIGMAS_AUTOR]': comparators('plaintiff'),
    '[PARADIGMAS_REU]': comparators('defendant'),
    '[FUNCOES_AUTOR]': jobs('plaintiff'),
    '[FUNCOES_REU]': jobs('defendant'),
    '[AGENTES_PRESENTES]': agents('yes'),
    '[AGENTES_AUSENTES]': agents('no'),
    '[DOCUMENTOS_SOLICITADOS]': juntar(
      field.documents.filter((document) => document.requested).map((document) => label(document.document)),
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
}: VariablesData): ReportValues => {
  const name = NAME[legalCase.courtType];
  const inspectionStart =
    field?.start ??
    appointments
      .filter((appointment) => appointment.type === 'inspection' && appointment.status !== 'canceled')
      .sort((a, b) => b.start.getTime() - a.start.getTime())[0]?.start;
  const { nonPrescribedPeriodStart: start, nonPrescribedPeriodEnd: end } = legalCase;
  return {
    '[NUMERO_PROCESSO]': legalCase.processNumber,
    '[TRIBUNAL]': legalCase.court,
    '[VARA]': legalCase.division,
    '[COMARCA]': legalCase.district,
    '[JUSTICA]': label(legalCase.courtType),
    '[OBJETO]': legalCase.subject,
    '[NOME_AUTOR]': names(legalCase, 'plaintiff', 'party'),
    '[NOME_REU]': names(legalCase, 'defendant', 'party'),
    '[DENOMINACAO_AUTOR]': name.plaintiff,
    '[DENOMINACAO_REU]': name.defendant,
    '[ADVOGADOS_AUTOR]': names(legalCase, 'plaintiff', 'lawyer'),
    '[ADVOGADOS_REU]': names(legalCase, 'defendant', 'lawyer'),
    '[DATA_NOMEACAO]': day(legalCase.nominationDate),
    '[DATA_VISTORIA]': inspectionStart ? day(dateInDisplayTz(inspectionStart)) : undefined,
    '[HORA_VISTORIA]': inspectionStart ? timeInDisplayTz(inspectionStart) : undefined,
    '[LOCAL_PERICIA]': legalCase.location,
    '[FUNCAO_RECLAMANTE]': legalCase.claimantJob,
    '[DATA_ADMISSAO]': day(legalCase.hireDate),
    '[DATA_DEMISSAO]': day(legalCase.terminationDate),
    '[PERIODO_IMPRESCRITO]': start && end ? `${day(start)} a ${day(end)}` : undefined,
    '[DATA_EXTENSO]': byWords(today),
    '[PERITO_NOME]': expert.name,
    '[PERITO_REGISTRO]': expert.professionalRegistration,
    '[PERITO_FORMACAO]': expert.education,
    '[ESCRITORIO_NOME]': identity.name,
    ...(field ? fieldValues(field.data, name) : {}),
  };
};
