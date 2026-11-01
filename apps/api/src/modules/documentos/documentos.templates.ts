import { DEADLINE_DUE_SOON_DAYS, INSPECTION_AGENTS, INSPECTION_DOCUMENTS, STALLED_CASE_DAYS } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import {
  dateTime,
  day,
  dinheiro,
  esc,
  fields,
  montarDocumento,
  rotulo,
  secao,
  tabela,
  vazio,
} from './documento.layout.js';
import type {
  ChecklistDados,
  CronogramaDados,
  DocumentoBase,
  FinanceiroDados,
  SheetData,
  StalledData,
} from './documentos.schema.js';

// Um documento = função pura (dados) → HTML do PDF; testada sem navegador.

type Case = SheetData['legalCase'];

// Trabalhista nomeia reclamante/reclamada; cível e federal, autor/réu.
const sidesNames = (legalCase: Case) =>
  legalCase.courtType === 'labor'
    ? { plaintiff: 'Reclamante', defendant: 'Reclamada' }
    : { plaintiff: 'Autor', defendant: 'Réu' };

const sideNames = (legalCase: Case, side: 'plaintiff' | 'defendant') =>
  legalCase.parties
    .filter((party) => party.side === side && party.tipo === 'party')
    .map((party) => party.nome)
    .join(', ');

const documento = (base: DocumentoBase, titulo: string, subtitulo: string | undefined, corpo: string): PdfDocument =>
  montarDocumento({
    titulo,
    subtitulo,
    corpo,
    identity: base.identity,
    expertName: base.expert.name,
    geradoEm: base.geradoEm,
  });

const processData = (legalCase: Case) =>
  fields([
    ['Número do processo', legalCase.processNumber],
    ['Justiça', rotulo(legalCase.courtType)],
    ['Tribunal', legalCase.court],
    ['Vara', legalCase.division],
    ['Comarca', legalCase.district],
    ['Atuação', rotulo(legalCase.role)],
    ['Etapa', rotulo(legalCase.status)],
    ['Nomeação', day(legalCase.nominationDate)],
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

export const sheetHtml = (dados: SheetData): PdfDocument => {
  const { legalCase, deadlines, appointments, financeiro, expert } = dados;
  const sides = sidesNames(legalCase);
  const parties = legalCase.parties.length
    ? tabela(
        ['Polo', 'Tipo', 'Nome'],
        legalCase.parties.map((party) => [
          esc(sides[party.side]),
          party.tipo === 'lawyer' ? 'Advogado' : 'Parte',
          esc(party.nome),
        ]),
      )
    : vazio('Nenhuma parte cadastrada.');
  const listDeadlines = deadlines.length
    ? tabela(
        ['Prazo', 'Vencimento', 'Status'],
        deadlines.map((deadline) => [
          esc(deadline.titulo),
          esc(day(deadline.vencimento)),
          esc(
            deadline.filedDate ? `${rotulo(deadline.status)} em ${day(deadline.filedDate)}` : rotulo(deadline.status),
          ),
        ]),
      )
    : vazio('Nenhum prazo cadastrado.');
  const appointmentList = appointments.length
    ? tabela(
        ['Quando', 'Tipo', 'Compromisso', 'Local', 'Status'],
        appointments.map((appointment) => [
          esc(dateTime(appointment.inicio)),
          esc(rotulo(appointment.tipo)),
          esc(appointment.titulo),
          esc(appointment.local),
          esc(rotulo(appointment.status)),
        ]),
      )
    : vazio('Nenhum compromisso cadastrado.');
  const movements = legalCase.movements.length
    ? tabela(
        ['Data', 'Movimentação', 'Observações'],
        legalCase.movements.map((movement) => [
          esc(day(movement.data)),
          esc(rotulo(movement.tipo)),
          esc(movement.observacoes),
        ]),
      )
    : vazio('Nenhuma movimentação lançada.');
  const resumoFinanceiro = financeiro
    ? secao(
        'Resumo financeiro',
        fields([
          ['Honorários propostos', dinheiro(legalCase.proposedFeesCents)],
          ['Honorários fixados', dinheiro(legalCase.fixedFeesCents)],
          ['Honorários lançados', dinheiro(financeiro.feesCents)],
          ['Recebido', dinheiro(financeiro.recebidoCents)],
          ['Saldo a receber', dinheiro(financeiro.saldoCents)],
          ['Despesas', dinheiro(financeiro.despesasCents)],
        ]),
      )
    : '';

  return documento(
    dados,
    'Ficha da perícia',
    legalCase.processNumber,
    [
      secao('Dados do processo', processData(legalCase)),
      hasLaborData(legalCase) ? secao('Dados do laudo trabalhista', laborData(legalCase)) : '',
      secao('Partes e advogados', parties),
      secao('Prazos', listDeadlines),
      secao('Compromissos', appointmentList),
      secao('Movimentações', movements),
      resumoFinanceiro,
      secao(
        'Perito responsável',
        fields([
          ['Nome', expert.name],
          ['Registro profissional', expert.registroProfissional],
          ['Formação', expert.formacao],
        ]),
      ),
    ].join(''),
  );
};

const AGENTS = INSPECTION_AGENTS.map(rotulo);

const REQUESTED_DOCUMENTS = INSPECTION_DOCUMENTS.map(rotulo);

const CAIXA = '<span class="caixa"></span>';
const rowsBlank = (quantidade: number, colunas: number) =>
  Array.from({ length: quantidade }, () => Array.from({ length: colunas }, () => ''));

export const checklistHtml = (dados: ChecklistDados): PdfDocument => {
  const { legalCase, expert } = dados;
  const sides = sidesNames(legalCase);
  const participants = [
    ...legalCase.parties.map((party) => [
      esc(party.nome),
      esc(party.tipo === 'lawyer' ? `Advogado (${sides[party.side].toLowerCase()})` : sides[party.side]),
      '',
    ]),
    [esc(expert.name), 'Perito', ''],
    ...rowsBlank(4, 3),
  ];

  return documento(
    dados,
    'Checklist de campo',
    legalCase.processNumber,
    [
      secao(
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
      secao('Participantes', tabela(['Nome', 'Qualidade', 'Assinatura'], participants, 'linhas')),
      secao(
        'Mapeamento de agentes',
        tabela(
          ['Agente', 'Sim', 'Não', 'Observações'],
          AGENTS.map((agent) => [esc(agent), CAIXA, CAIXA, '']),
          'linhas',
        ),
      ),
      secao(
        'Matriz de divergências',
        tabela(['Item', sides.plaintiff, sides.defendant, 'Constatação'], rowsBlank(6, 4), 'linhas'),
      ),
      secao(
        'Documentos solicitados',
        tabela(
          ['', 'Documento', 'Observações'],
          [
            ...REQUESTED_DOCUMENTS.map((item) => [CAIXA, esc(item), '']),
            ...rowsBlank(2, 3).map((l) => [CAIXA, ...l.slice(1)]),
          ],
          'linhas',
        ),
      ),
      secao('Anotações', '<div class="anotacoes"></div>'),
    ].join(''),
  );
};

const DAY_MS = 86_400_000;
const daysUntil = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DAY_MS);

const faltam = (days: number) => {
  if (days < 0) return `<span class="vencido">Vencido há ${-days} ${-days === 1 ? 'dia' : 'dias'}</span>`;
  if (days === 0) return '<span class="alerta">Vence hoje</span>';
  const texto = `Faltam ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return days <= DEADLINE_DUE_SOON_DAYS ? `<span class="alerta">${texto} · vence em breve</span>` : texto;
};

export const cronogramaHtml = (dados: CronogramaDados): PdfDocument =>
  documento(
    dados,
    'Cronograma de prazos',
    `Prazos pendentes por vencimento · "vence em breve" até ${DEADLINE_DUE_SOON_DAYS} dias`,
    dados.deadlines.length
      ? tabela(
          ['Vencimento', 'Situação', 'Processo', 'Prazo'],
          dados.deadlines.map((deadline) => [
            esc(day(deadline.vencimento)),
            faltam(daysUntil(dados.today, deadline.vencimento)),
            esc(deadline.caseNumber),
            esc(deadline.titulo),
          ]),
        )
      : vazio('Nenhum prazo pendente.'),
  );

const financeRows = (titulo: string, linhas: FinanceiroDados['relatorio']['recebidos'], rotuloData: string) =>
  secao(
    titulo,
    linhas.length
      ? tabela(
          [rotuloData, 'Descrição', 'Categoria', 'Processo', 'Valor'],
          linhas.map((linha) => [
            esc(day(linha.data)),
            esc(linha.conta ? `${linha.descricao} (${linha.conta})` : linha.descricao),
            esc(rotulo(linha.categoria)),
            esc(linha.caseNumber),
            `<span class="num">${esc(dinheiro(linha.valorCents))}</span>`,
          ]),
        )
      : vazio('Nada no período.'),
  );

export const financeiroHtml = (dados: FinanceiroDados): PdfDocument => {
  const { relatorio, period } = dados;
  const { totais } = relatorio;
  const total = (rotuloTotal: string, cents: number) =>
    `<div><dt>${esc(rotuloTotal)}</dt><dd>${esc(dinheiro(cents))}</dd></div>`;
  return documento(
    dados,
    'Relatório financeiro',
    `Período de ${day(period.from)} a ${day(period.to)}`,
    [
      secao(
        'Totais',
        `<dl class="totais">${[
          total('Recebido', totais.recebidoCents),
          total('Pago', totais.pagoCents),
          total('Saldo realizado', totais.actualBalanceCents),
          total('A receber', totais.aReceberCents),
          total('A pagar', totais.aPagarCents),
          total('Saldo previsto', totais.saldoPrevistoCents),
        ].join('')}</dl>`,
      ),
      financeRows('Recebido', relatorio.recebidos, 'Data'),
      financeRows('Pago', relatorio.pagos, 'Data'),
      financeRows('A receber', relatorio.aReceber, 'Vencimento'),
      financeRows('A pagar', relatorio.aPagar, 'Vencimento'),
    ].join(''),
  );
};

export const stalledHtml = (dados: StalledData): PdfDocument =>
  documento(
    dados,
    'Perícias paradas',
    `Abertas sem movimentação (entrega do laudo, honorários, intimação para esclarecimentos ou laudo complementar) há mais de ${STALLED_CASE_DAYS} dias`,
    dados.stalled.length
      ? tabela(
          ['Processo', 'Etapa', 'Tribunal / vara', 'Desde', 'Dias parada'],
          dados.stalled.map((stalled) => [
            esc(stalled.processNumber),
            esc(rotulo(stalled.status)),
            esc([stalled.court, stalled.division].filter(Boolean).join(' · ')),
            esc(`${day(stalled.referencia)} (${rotulo(stalled.origin)})`),
            `<span class="num">${stalled.stalledDays}</span>`,
          ]),
        )
      : vazio('Nenhuma perícia parada.'),
  );
