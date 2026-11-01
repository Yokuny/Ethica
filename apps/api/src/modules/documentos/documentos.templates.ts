import { DEADLINE_DUE_SOON_DAYS, STALLED_CASE_DAYS, VISTORIA_AGENTES, VISTORIA_DOCUMENTOS } from '@ethica/contracts';
import type { PdfDocument } from '../../providers/pdfRenderer.js';
import {
  campos,
  dataHora,
  dia,
  dinheiro,
  esc,
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
  FichaDados,
  FinanceiroDados,
  StalledData,
} from './documentos.schema.js';

// Um documento = função pura (dados) → HTML do PDF; testada sem navegador.

type Case = FichaDados['legalCase'];

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
  campos([
    ['Número do processo', legalCase.processNumber],
    ['Justiça', rotulo(legalCase.courtType)],
    ['Tribunal', legalCase.court],
    ['Vara', legalCase.division],
    ['Comarca', legalCase.district],
    ['Atuação', rotulo(legalCase.role)],
    ['Etapa', rotulo(legalCase.status)],
    ['Nomeação', dia(legalCase.nominationDate)],
    ['Objeto', legalCase.subject],
  ]);

const laborData = (legalCase: Case) =>
  campos([
    ['Autuação', dia(legalCase.docketingDate)],
    ['Admissão', dia(legalCase.hireDate)],
    ['Demissão', dia(legalCase.terminationDate)],
    [
      'Período imprescrito',
      legalCase.nonPrescribedPeriodStart
        ? `${dia(legalCase.nonPrescribedPeriodStart)} a ${dia(legalCase.nonPrescribedPeriodEnd)}`
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

export const fichaHtml = (dados: FichaDados): PdfDocument => {
  const { legalCase, deadlines, compromissos, financeiro, expert } = dados;
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
          esc(dia(deadline.vencimento)),
          esc(
            deadline.filedDate ? `${rotulo(deadline.status)} em ${dia(deadline.filedDate)}` : rotulo(deadline.status),
          ),
        ]),
      )
    : vazio('Nenhum prazo cadastrado.');
  const listaCompromissos = compromissos.length
    ? tabela(
        ['Quando', 'Tipo', 'Compromisso', 'Local', 'Status'],
        compromissos.map((compromisso) => [
          esc(dataHora(compromisso.inicio)),
          esc(rotulo(compromisso.tipo)),
          esc(compromisso.titulo),
          esc(compromisso.local),
          esc(rotulo(compromisso.status)),
        ]),
      )
    : vazio('Nenhum compromisso cadastrado.');
  const movements = legalCase.movements.length
    ? tabela(
        ['Data', 'Movimentação', 'Observações'],
        legalCase.movements.map((movement) => [
          esc(dia(movement.data)),
          esc(rotulo(movement.tipo)),
          esc(movement.observacoes),
        ]),
      )
    : vazio('Nenhuma movimentação lançada.');
  const resumoFinanceiro = financeiro
    ? secao(
        'Resumo financeiro',
        campos([
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
      secao('Compromissos', listaCompromissos),
      secao('Movimentações', movements),
      resumoFinanceiro,
      secao(
        'Perito responsável',
        campos([
          ['Nome', expert.name],
          ['Registro profissional', expert.registroProfissional],
          ['Formação', expert.formacao],
        ]),
      ),
    ].join(''),
  );
};

const AGENTES = VISTORIA_AGENTES.map(rotulo);

const DOCUMENTOS_SOLICITADOS = VISTORIA_DOCUMENTOS.map(rotulo);

const CAIXA = '<span class="caixa"></span>';
const rowsBlank = (quantidade: number, colunas: number) =>
  Array.from({ length: quantidade }, () => Array.from({ length: colunas }, () => ''));

export const checklistHtml = (dados: ChecklistDados): PdfDocument => {
  const { legalCase, expert } = dados;
  const sides = sidesNames(legalCase);
  const participantes = [
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
        campos([
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
      secao('Participantes', tabela(['Nome', 'Qualidade', 'Assinatura'], participantes, 'linhas')),
      secao(
        'Mapeamento de agentes',
        tabela(
          ['Agente', 'Sim', 'Não', 'Observações'],
          AGENTES.map((agente) => [esc(agente), CAIXA, CAIXA, '']),
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
            ...DOCUMENTOS_SOLICITADOS.map((item) => [CAIXA, esc(item), '']),
            ...rowsBlank(2, 3).map((l) => [CAIXA, ...l.slice(1)]),
          ],
          'linhas',
        ),
      ),
      secao('Anotações', '<div class="anotacoes"></div>'),
    ].join(''),
  );
};

const DIA_MS = 86_400_000;
const diasAte = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA_MS);

const faltam = (dias: number) => {
  if (dias < 0) return `<span class="vencido">Vencido há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}</span>`;
  if (dias === 0) return '<span class="alerta">Vence hoje</span>';
  const texto = `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return dias <= DEADLINE_DUE_SOON_DAYS ? `<span class="alerta">${texto} · vence em breve</span>` : texto;
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
            esc(dia(deadline.vencimento)),
            faltam(diasAte(dados.hoje, deadline.vencimento)),
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
            esc(dia(linha.data)),
            esc(linha.conta ? `${linha.descricao} (${linha.conta})` : linha.descricao),
            esc(rotulo(linha.categoria)),
            esc(linha.caseNumber),
            `<span class="num">${esc(dinheiro(linha.valorCents))}</span>`,
          ]),
        )
      : vazio('Nada no período.'),
  );

export const financeiroHtml = (dados: FinanceiroDados): PdfDocument => {
  const { relatorio, periodo } = dados;
  const { totais } = relatorio;
  const total = (rotuloTotal: string, cents: number) =>
    `<div><dt>${esc(rotuloTotal)}</dt><dd>${esc(dinheiro(cents))}</dd></div>`;
  return documento(
    dados,
    'Relatório financeiro',
    `Período de ${dia(periodo.from)} a ${dia(periodo.to)}`,
    [
      secao(
        'Totais',
        `<dl class="totais">${[
          total('Recebido', totais.recebidoCents),
          total('Pago', totais.pagoCents),
          total('Saldo realizado', totais.saldoRealizadoCents),
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
            esc(`${dia(stalled.referencia)} (${rotulo(stalled.origem)})`),
            `<span class="num">${stalled.stalledDays}</span>`,
          ]),
        )
      : vazio('Nenhuma perícia parada.'),
  );
