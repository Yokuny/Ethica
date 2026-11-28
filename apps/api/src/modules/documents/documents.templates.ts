import {
  DUE_SOON_DAYS,
  INSPECTION_AGENTS,
  INSPECTION_DOCUMENTS,
  STALLED_CASE_DAYS,
  usesContractor,
} from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdf-renderer.js';
import {
  buildDocument,
  dateTime,
  day,
  dinheiro,
  empty,
  esc,
  fields,
  label,
  section,
  table,
} from './document.layout.js';
import type {
  ChecklistData,
  DocumentBase,
  FinanceData,
  InspectionTermData,
  ScheduleData,
  SheetData,
  StalledData,
} from './documents.schema.js';

// A document = pure function (data) → PDF HTML; tested without a browser.

type Case = SheetData['legalCase'];

// Labor cases name claimant/respondent; civil and federal, plaintiff/defendant.
const sidesNames = (legalCase: Case) =>
  legalCase.courtType === 'labor'
    ? { plaintiff: 'Reclamante', defendant: 'Reclamada' }
    : { plaintiff: 'Autor', defendant: 'Réu' };

const sideNames = (legalCase: Case, side: 'plaintiff' | 'defendant') =>
  legalCase.parties
    .filter((party) => party.side === side && party.type === 'party')
    .map((party) => party.name)
    .join(', ');

const document = (base: DocumentBase, title: string, subtitle: string | undefined, body: string): PdfDocument =>
  buildDocument({
    title,
    subtitle,
    body,
    identity: base.identity,
    expertName: base.expert.name,
    generatedAt: base.generatedAt,
  });

const processData = (legalCase: Case) =>
  fields([
    ['Número do processo', legalCase.processNumber],
    ['Esfera', label(legalCase.courtType)],
    ['Tribunal', legalCase.court],
    ['Vara', legalCase.division],
    ['Comarca', legalCase.district],
    ['Contratante', legalCase.contractor?.name],
    ['Tipo de serviço', label(legalCase.serviceType)],
    ['Fase', label(legalCase.phase)],
    ['Status', label(legalCase.status)],
    [usesContractor(legalCase) ? 'Contratação' : 'Nomeação', day(legalCase.nominationDate)],
    ['Objeto', legalCase.subject],
  ]);

const laborData = (legalCase: Case) =>
  fields([
    ['Autuação', day(legalCase.docketingDate)],
    ['Admissão', day(legalCase.hireDate)],
    ['Demissão', day(legalCase.terminationDate)],
    [
      'Período imprescrito',
      legalCase.nonPrescribedPeriodStart
        ? `${day(legalCase.nonPrescribedPeriodStart)} a ${day(legalCase.nonPrescribedPeriodEnd)}`
        : undefined,
    ],
    ['Função do reclamante', legalCase.claimantJob],
    ['Local da perícia', legalCase.location],
  ]);

const hasLaborData = (legalCase: Case) =>
  Boolean(
    legalCase.docketingDate ||
      legalCase.hireDate ||
      legalCase.terminationDate ||
      legalCase.nonPrescribedPeriodStart ||
      legalCase.claimantJob ||
      legalCase.location,
  );

export const sheetHtml = (data: SheetData): PdfDocument => {
  const { legalCase, deadlines, appointments, finance, expert } = data;
  const sides = sidesNames(legalCase);
  const parties = legalCase.parties.length
    ? table(
        ['Polo', 'Tipo', 'Nome'],
        legalCase.parties.map((party) => [
          esc(sides[party.side]),
          party.type === 'lawyer' ? 'Advogado' : 'Parte',
          esc(party.name),
        ]),
      )
    : empty('Nenhuma parte cadastrada.');
  const listDeadlines = deadlines.length
    ? table(
        ['Prazo', 'Vencimento', 'Status'],
        deadlines.map((deadline) => [
          esc(deadline.title),
          esc(day(deadline.dueDate)),
          esc(deadline.filedDate ? `${label(deadline.status)} em ${day(deadline.filedDate)}` : label(deadline.status)),
        ]),
      )
    : empty('Nenhum prazo cadastrado.');
  const appointmentList = appointments.length
    ? table(
        ['Quando', 'Tipo', 'Compromisso', 'Local', 'Status'],
        appointments.map((appointment) => [
          esc(dateTime(appointment.start)),
          esc(label(appointment.type)),
          esc(appointment.title),
          esc(appointment.location),
          esc(label(appointment.status)),
        ]),
      )
    : empty('Nenhum compromisso cadastrado.');
  const movements = legalCase.movements.length
    ? table(
        ['Data', 'Movimentação', 'Observações'],
        legalCase.movements.map((movement) => [
          esc(day(movement.date)),
          esc(label(movement.type)),
          esc(movement.notes),
        ]),
      )
    : empty('Nenhuma movimentação lançada.');
  const financeSummary = finance
    ? section(
        'Resumo financeiro',
        fields([
          ['Honorários propostos', dinheiro(legalCase.proposedFeesCents)],
          ['Honorários fixados', dinheiro(legalCase.fixedFeesCents)],
          ['Honorários lançados', dinheiro(finance.feesCents)],
          ['Recebido', dinheiro(finance.receivedCents)],
          ['Saldo a receber', dinheiro(finance.balanceCents)],
          ['Despesas', dinheiro(finance.expensesCents)],
        ]),
      )
    : '';

  return document(
    data,
    'Ficha da perícia',
    legalCase.processNumber,
    [
      section('Dados do processo', processData(legalCase)),
      hasLaborData(legalCase) ? section('Dados do laudo trabalhista', laborData(legalCase)) : '',
      section('Partes e advogados', parties),
      section('Prazos', listDeadlines),
      section('Compromissos', appointmentList),
      section('Movimentações', movements),
      financeSummary,
      section(
        'Perito responsável',
        fields([
          ['Nome', expert.name],
          ['Registro profissional', expert.professionalRegistration],
          ['Formação', expert.education],
        ]),
      ),
    ].join(''),
  );
};

const AGENTS = INSPECTION_AGENTS.map(label);

const REQUESTED_DOCUMENTS = INSPECTION_DOCUMENTS.map(label);

const CAIXA = '<span class="caixa"></span>';
const rowsBlank = (quantidade: number, columns: number) =>
  Array.from({ length: quantidade }, () => Array.from({ length: columns }, () => ''));

export const checklistHtml = (data: ChecklistData): PdfDocument => {
  const { legalCase, expert } = data;
  const sides = sidesNames(legalCase);
  const participants = [
    ...legalCase.parties.map((party) => [
      esc(party.name),
      esc(party.type === 'lawyer' ? `Advogado (${sides[party.side].toLowerCase()})` : sides[party.side]),
      '',
    ]),
    [esc(expert.name), 'Perito', ''],
    ...rowsBlank(4, 3),
  ];

  return document(
    data,
    'Checklist de campo',
    legalCase.processNumber,
    [
      section(
        'Processo',
        fields([
          ['Número do processo', legalCase.processNumber],
          ['Tribunal / vara', [legalCase.court, legalCase.division].filter(Boolean).join(' · ')],
          [sides.plaintiff, sideNames(legalCase, 'plaintiff') || '—'],
          [sides.defendant, sideNames(legalCase, 'defendant') || '—'],
          ['Objeto', legalCase.subject],
          ['Função do reclamante', legalCase.claimantJob],
          ['Local da perícia', legalCase.location],
          ['Data e hora da vistoria', '____/____/________   ____:____'],
        ]),
      ),
      section('Participantes', table(['Nome', 'Qualidade', 'Assinatura'], participants, 'linhas')),
      section(
        'Mapeamento de agentes',
        table(
          ['Agente', 'Sim', 'Não', 'Observações'],
          AGENTS.map((agent) => [esc(agent), CAIXA, CAIXA, '']),
          'linhas',
        ),
      ),
      section(
        'Matriz de divergências',
        table(['Item', sides.plaintiff, sides.defendant, 'Constatação'], rowsBlank(6, 4), 'linhas'),
      ),
      section(
        'Documentos solicitados',
        table(
          ['', 'Documento', 'Observações'],
          [
            ...REQUESTED_DOCUMENTS.map((item) => [CAIXA, esc(item), '']),
            ...rowsBlank(2, 3).map((l) => [CAIXA, ...l.slice(1)]),
          ],
          'linhas',
        ),
      ),
      section('Anotações', '<div class="anotacoes"></div>'),
    ].join(''),
  );
};

const DAY_MS = 86_400_000;
const daysUntil = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DAY_MS);

const missing = (days: number) => {
  if (days < 0) return `<span class="vencido">Vencido há ${-days} ${-days === 1 ? 'dia' : 'dias'}</span>`;
  if (days === 0) return '<span class="alerta">Vence hoje</span>';
  const text = `Faltam ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return days <= DUE_SOON_DAYS ? `<span class="alerta">${text} · vence em breve</span>` : text;
};

export const scheduleHtml = (data: ScheduleData): PdfDocument =>
  document(
    data,
    'Cronograma de prazos',
    `Prazos pendentes por vencimento · "vence em breve" até ${DUE_SOON_DAYS} dias`,
    data.deadlines.length
      ? table(
          ['Vencimento', 'Situação', 'Processo', 'Prazo'],
          data.deadlines.map((deadline) => [
            esc(day(deadline.dueDate)),
            missing(daysUntil(data.today, deadline.dueDate)),
            esc(deadline.caseNumber),
            esc(deadline.title),
          ]),
        )
      : empty('Nenhum prazo pendente.'),
  );

// Fee sections also show the fixed fee beside what moved in the row.
const financeRows = (
  title: string,
  rows: FinanceData['report']['received'],
  labelData: string,
  labelAmount: string,
  withFee = false,
) =>
  section(
    title,
    rows.length
      ? table(
          [labelData, 'OS', 'Descrição', 'Contratante', ...(withFee ? ['Honorário fixado'] : []), labelAmount],
          rows.map((row) => [
            esc(day(row.date)),
            esc(row.serviceOrder),
            esc(row.account ? `${row.description} (${row.account})` : row.description),
            esc(row.client),
            ...(withFee ? [esc(dinheiro(row.feeCents))] : []),
            esc(dinheiro(row.amountCents)),
          ]),
          `fios data${withFee ? ' honorario' : ''}`,
        )
      : empty('Nada no período.'),
  );

export const financeHtml = (data: FinanceData): PdfDocument => {
  const { report, period } = data;
  const { totals } = report;
  const total = (labelTotal: string, cents: number) => [esc(labelTotal), esc(dinheiro(cents))];
  return document(
    data,
    'Relatório financeiro',
    `Período de ${day(period.from)} a ${day(period.to)}`,
    [
      section(
        'Totais',
        table(
          ['Item', 'Valor'],
          [
            total('Receita', totals.receivedCents),
            total('Despesa', totals.paidCents),
            total('Saldo líquido', totals.actualBalanceCents),
            total('A receber', totals.receivableCents),
            total('A pagar', totals.payableCents),
            total('Saldo previsto', totals.expectedBalanceCents),
          ],
          'fios',
        ),
      ),
      financeRows('Receita', report.received, 'Data', 'Valor recebido', true),
      financeRows('Despesa', report.paid, 'Data', 'Valor'),
      financeRows('A receber', report.receivable, 'Vencimento', 'Valor a receber', true),
      financeRows('A pagar', report.payable, 'Vencimento', 'Valor'),
    ].join(''),
  );
};

export const stalledHtml = (data: StalledData): PdfDocument =>
  document(
    data,
    'Perícias paradas',
    `Abertas sem movimentação (entrega do laudo, honorários, intimação para esclarecimentos ou laudo complementar) há mais de ${STALLED_CASE_DAYS} dias`,
    data.stalled.length
      ? table(
          ['Processo', 'Fase', 'Tribunal / vara', 'Desde', 'Dias parada'],
          data.stalled.map((stalled) => [
            esc(stalled.processNumber),
            esc(label(stalled.phase)),
            esc([stalled.court, stalled.division].filter(Boolean).join(' · ')),
            esc(`${day(stalled.reference)} (${label(stalled.origin)})`),
            `<span class="num">${stalled.stalledDays}</span>`,
          ]),
        )
      : empty('Nenhuma perícia parada.'),
  );

// Inspection term (AD-239). The case of the field has no justice type: the sides use both names, as on the screen.
const ATTENDEE_CAPACITY: Record<string, string> = {
  plaintiff: 'Reclamante / autor',
  defendant: 'Reclamada / réu',
  plaintiff_lawyer: 'Advogado(a) do reclamante / autor',
  defendant_lawyer: 'Advogado(a) da reclamada / réu',
  technical_assistant: 'Assistente técnico',
  witness: 'Testemunha',
  other: 'Outro',
};
const SIDE = { plaintiff: 'Reclamante / autor', defendant: 'Reclamada / réu' };
const yesNo = (value: boolean | undefined) => (value ? 'Sim' : 'Não');
const years = (start?: number, end?: number) => [start, end].filter(Boolean).join(' a ');
const version = (job: { activities?: string; frequency?: string; timeExposure?: string }) =>
  [
    job.activities,
    job.frequency && `Frequência: ${job.frequency}`,
    job.timeExposure && `Exposição: ${job.timeExposure}`,
  ]
    .filter(Boolean)
    .map((text) => esc(text))
    .join('<br>');
const signatureBox = (name: string, role: string, src?: string) =>
  `<div class="assinatura">${src ? `<img src="${src}" alt="">` : '<div class="linha"></div>'}<p><strong>${esc(name)}</strong><br>${esc(role)}</p></div>`;

// Everything collected at the inspection, except the internal notes, which never leave the record (AD-130).
export const inspectionHtml = (data: InspectionTermData): PdfDocument => {
  const { item, photos, signatures, expert } = data;
  const { appointment, legalCase, inspection } = item;
  const record = inspection.data;
  const audios = inspection.media.filter((media) => media.type === 'audio').length;

  return document(
    data,
    'Termo de vistoria',
    legalCase?.processNumber ?? legalCase?.subject,
    [
      section(
        'Vistoria',
        fields([
          ['Compromisso', appointment.title],
          ['Data e hora', dateTime(appointment.start)],
          ['Local', appointment.location],
          ['Processo', legalCase?.processNumber],
          ['Objeto', legalCase?.subject],
          [SIDE.plaintiff, legalCase?.plaintiff],
          [SIDE.defendant, legalCase?.defendant],
        ]),
      ),
      section(
        'Presentes',
        record.attendees.length
          ? table(
              ['Nome', 'Qualidade', 'E-mail'],
              record.attendees.map((attendee) => [
                esc(attendee.name),
                esc(ATTENDEE_CAPACITY[attendee.capacity]),
                esc(attendee.email),
              ]),
            )
          : empty('Ninguém registrado.'),
      ),
      section(
        'Paradigmas',
        record.comparators.length
          ? table(
              ['Indicado por', 'Nome', 'Função', 'Período', 'Trabalhou junto'],
              record.comparators.map((comparator) => [
                esc(SIDE[comparator.side]),
                esc(comparator.name),
                esc(comparator.job),
                esc(comparator.period),
                yesNo(comparator.workedTogether),
              ]),
            )
          : empty('Nenhum paradigma indicado.'),
      ),
      section(
        'Funções e atividades',
        record.jobs.length
          ? table(
              ['Função', 'Período', 'Local', `Versão: ${SIDE.plaintiff}`, `Versão: ${SIDE.defendant}`],
              record.jobs.map((job) => [
                esc(job.title),
                esc(years(job.yearStart, job.yearEnd)),
                esc(job.location),
                version(job.plaintiff),
                version(job.defendant),
              ]),
            )
          : empty('Nenhuma função registrada.'),
      ),
      section(
        'Agentes',
        record.agents.length
          ? table(
              ['Agente', 'Presente', 'EPI', 'Observações'],
              record.agents.map((agent) => [
                esc(label(agent.agent)),
                agent.present === 'yes' ? 'Sim' : 'Não',
                esc(agent.ppe),
                esc(agent.notes),
              ]),
            )
          : empty('Nenhum agente registrado.'),
      ),
      section(
        'Documentos solicitados',
        record.documents.length
          ? table(
              ['Documento', 'Solicitado', 'Observações'],
              record.documents.map((item) => [esc(label(item.document)), yesNo(item.requested), esc(item.notes)]),
            )
          : empty('Nenhum documento registrado.'),
      ),
      section(
        'Fotos',
        `${
          photos.length
            ? `<div class="fotos">${photos
                .map(
                  (photo) =>
                    `<figure>${photo.src ? `<img src="${photo.src}" alt="">` : ''}${photo.caption ? `<figcaption>${esc(photo.caption)}</figcaption>` : ''}</figure>`,
                )
                .join('')}</div>`
            : empty('Nenhuma foto.')
        }${audios ? `<p>${audios} ${audios === 1 ? 'áudio gravado' : 'áudios gravados'} no registro.</p>` : ''}`,
      ),
      section(
        'Assinaturas',
        `<div class="assinaturas">${[
          ...record.attendees.map((attendee) =>
            signatureBox(attendee.name, ATTENDEE_CAPACITY[attendee.capacity] ?? '', signatures.get(attendee.id)),
          ),
          signatureBox(expert.name, 'Perito'),
        ].join('')}</div>`,
      ),
    ].join(''),
  );
};
