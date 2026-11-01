import {
  PERICIA_PARADA_DIAS,
  PRAZO_VENCE_EM_BREVE_DIAS,
  VISTORIA_AGENTES,
  VISTORIA_DOCUMENTOS,
} from '@ethica/contracts';
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
  ParadasDados,
} from './documentos.schema.js';

// Um documento = função pura (dados) → HTML do PDF; testada sem navegador.

type Pericia = FichaDados['pericia'];

// Trabalhista nomeia reclamante/reclamada; cível e federal, autor/réu.
const nomesDosPolos = (pericia: Pericia) =>
  pericia.justica === 'labor'
    ? { plaintiff: 'Reclamante', defendant: 'Reclamada' }
    : { plaintiff: 'Autor', defendant: 'Réu' };

const nomesDoPolo = (pericia: Pericia, polo: 'plaintiff' | 'defendant') =>
  pericia.partes
    .filter((parte) => parte.polo === polo && parte.tipo === 'party')
    .map((parte) => parte.nome)
    .join(', ');

const documento = (base: DocumentoBase, titulo: string, subtitulo: string | undefined, corpo: string): PdfDocument =>
  montarDocumento({
    titulo,
    subtitulo,
    corpo,
    identity: base.identity,
    nomePerito: base.perito.name,
    geradoEm: base.geradoEm,
  });

const dadosDoProcesso = (pericia: Pericia) =>
  campos([
    ['Número do processo', pericia.numeroProcesso],
    ['Justiça', rotulo(pericia.justica)],
    ['Tribunal', pericia.tribunal],
    ['Vara', pericia.vara],
    ['Comarca', pericia.comarca],
    ['Atuação', rotulo(pericia.papel)],
    ['Etapa', rotulo(pericia.status)],
    ['Nomeação', dia(pericia.dataNomeacao)],
    ['Objeto', pericia.objeto],
  ]);

const dadosTrabalhistas = (pericia: Pericia) =>
  campos([
    ['Autuação', dia(pericia.dataAutuacao)],
    ['Admissão', dia(pericia.dataAdmissao)],
    ['Demissão', dia(pericia.dataDemissao)],
    [
      'Período imprescrito',
      pericia.periodoImprescritoInicio
        ? `${dia(pericia.periodoImprescritoInicio)} a ${dia(pericia.periodoImprescritoFim)}`
        : undefined,
    ],
    ['Função do reclamante', pericia.funcaoReclamante],
    ['Local da perícia', pericia.localPericia],
  ]);

const temDadosTrabalhistas = (pericia: Pericia) =>
  Boolean(
    pericia.dataAutuacao ||
      pericia.dataAdmissao ||
      pericia.dataDemissao ||
      pericia.periodoImprescritoInicio ||
      pericia.funcaoReclamante ||
      pericia.localPericia,
  );

export const fichaHtml = (dados: FichaDados): PdfDocument => {
  const { pericia, prazos, compromissos, financeiro, perito } = dados;
  const polos = nomesDosPolos(pericia);
  const partes = pericia.partes.length
    ? tabela(
        ['Polo', 'Tipo', 'Nome'],
        pericia.partes.map((parte) => [
          esc(polos[parte.polo]),
          parte.tipo === 'lawyer' ? 'Advogado' : 'Parte',
          esc(parte.nome),
        ]),
      )
    : vazio('Nenhuma parte cadastrada.');
  const listaPrazos = prazos.length
    ? tabela(
        ['Prazo', 'Vencimento', 'Status'],
        prazos.map((prazo) => [
          esc(prazo.titulo),
          esc(dia(prazo.vencimento)),
          esc(prazo.protocoladoEm ? `${rotulo(prazo.status)} em ${dia(prazo.protocoladoEm)}` : rotulo(prazo.status)),
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
  const movimentacoes = pericia.movimentacoes.length
    ? tabela(
        ['Data', 'Movimentação', 'Observações'],
        pericia.movimentacoes.map((movimentacao) => [
          esc(dia(movimentacao.data)),
          esc(rotulo(movimentacao.tipo)),
          esc(movimentacao.observacoes),
        ]),
      )
    : vazio('Nenhuma movimentação lançada.');
  const resumoFinanceiro = financeiro
    ? secao(
        'Resumo financeiro',
        campos([
          ['Honorários propostos', dinheiro(pericia.honorariosPropostosCents)],
          ['Honorários fixados', dinheiro(pericia.honorariosFixadosCents)],
          ['Honorários lançados', dinheiro(financeiro.honorariosCents)],
          ['Recebido', dinheiro(financeiro.recebidoCents)],
          ['Saldo a receber', dinheiro(financeiro.saldoCents)],
          ['Despesas', dinheiro(financeiro.despesasCents)],
        ]),
      )
    : '';

  return documento(
    dados,
    'Ficha da perícia',
    pericia.numeroProcesso,
    [
      secao('Dados do processo', dadosDoProcesso(pericia)),
      temDadosTrabalhistas(pericia) ? secao('Dados do laudo trabalhista', dadosTrabalhistas(pericia)) : '',
      secao('Partes e advogados', partes),
      secao('Prazos', listaPrazos),
      secao('Compromissos', listaCompromissos),
      secao('Movimentações', movimentacoes),
      resumoFinanceiro,
      secao(
        'Perito responsável',
        campos([
          ['Nome', perito.name],
          ['Registro profissional', perito.registroProfissional],
          ['Formação', perito.formacao],
        ]),
      ),
    ].join(''),
  );
};

const AGENTES = VISTORIA_AGENTES.map(rotulo);

const DOCUMENTOS_SOLICITADOS = VISTORIA_DOCUMENTOS.map(rotulo);

const CAIXA = '<span class="caixa"></span>';
const linhasEmBranco = (quantidade: number, colunas: number) =>
  Array.from({ length: quantidade }, () => Array.from({ length: colunas }, () => ''));

export const checklistHtml = (dados: ChecklistDados): PdfDocument => {
  const { pericia, perito } = dados;
  const polos = nomesDosPolos(pericia);
  const participantes = [
    ...pericia.partes.map((parte) => [
      esc(parte.nome),
      esc(parte.tipo === 'lawyer' ? `Advogado (${polos[parte.polo].toLowerCase()})` : polos[parte.polo]),
      '',
    ]),
    [esc(perito.name), 'Perito', ''],
    ...linhasEmBranco(4, 3),
  ];

  return documento(
    dados,
    'Checklist de campo',
    pericia.numeroProcesso,
    [
      secao(
        'Processo',
        campos([
          ['Número do processo', pericia.numeroProcesso],
          ['Tribunal / vara', [pericia.tribunal, pericia.vara].filter(Boolean).join(' · ')],
          [polos.plaintiff, nomesDoPolo(pericia, 'plaintiff') || '—'],
          [polos.defendant, nomesDoPolo(pericia, 'defendant') || '—'],
          ['Objeto', pericia.objeto],
          ['Função do reclamante', pericia.funcaoReclamante],
          ['Local da perícia', pericia.localPericia],
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
        tabela(['Item', polos.plaintiff, polos.defendant, 'Constatação'], linhasEmBranco(6, 4), 'linhas'),
      ),
      secao(
        'Documentos solicitados',
        tabela(
          ['', 'Documento', 'Observações'],
          [
            ...DOCUMENTOS_SOLICITADOS.map((item) => [CAIXA, esc(item), '']),
            ...linhasEmBranco(2, 3).map((l) => [CAIXA, ...l.slice(1)]),
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
  return dias <= PRAZO_VENCE_EM_BREVE_DIAS ? `<span class="alerta">${texto} · vence em breve</span>` : texto;
};

export const cronogramaHtml = (dados: CronogramaDados): PdfDocument =>
  documento(
    dados,
    'Cronograma de prazos',
    `Prazos pendentes por vencimento · "vence em breve" até ${PRAZO_VENCE_EM_BREVE_DIAS} dias`,
    dados.prazos.length
      ? tabela(
          ['Vencimento', 'Situação', 'Processo', 'Prazo'],
          dados.prazos.map((prazo) => [
            esc(dia(prazo.vencimento)),
            faltam(diasAte(dados.hoje, prazo.vencimento)),
            esc(prazo.periciaNumero),
            esc(prazo.titulo),
          ]),
        )
      : vazio('Nenhum prazo pendente.'),
  );

const linhasFinanceiras = (titulo: string, linhas: FinanceiroDados['relatorio']['recebidos'], rotuloData: string) =>
  secao(
    titulo,
    linhas.length
      ? tabela(
          [rotuloData, 'Descrição', 'Categoria', 'Processo', 'Valor'],
          linhas.map((linha) => [
            esc(dia(linha.data)),
            esc(linha.conta ? `${linha.descricao} (${linha.conta})` : linha.descricao),
            esc(rotulo(linha.categoria)),
            esc(linha.periciaNumero),
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
      linhasFinanceiras('Recebido', relatorio.recebidos, 'Data'),
      linhasFinanceiras('Pago', relatorio.pagos, 'Data'),
      linhasFinanceiras('A receber', relatorio.aReceber, 'Vencimento'),
      linhasFinanceiras('A pagar', relatorio.aPagar, 'Vencimento'),
    ].join(''),
  );
};

export const paradasHtml = (dados: ParadasDados): PdfDocument =>
  documento(
    dados,
    'Perícias paradas',
    `Abertas sem movimentação (entrega do laudo, honorários, intimação para esclarecimentos ou laudo complementar) há mais de ${PERICIA_PARADA_DIAS} dias`,
    dados.paradas.length
      ? tabela(
          ['Processo', 'Etapa', 'Tribunal / vara', 'Desde', 'Dias parada'],
          dados.paradas.map((parada) => [
            esc(parada.numeroProcesso),
            esc(rotulo(parada.status)),
            esc([parada.tribunal, parada.vara].filter(Boolean).join(' · ')),
            esc(`${dia(parada.referencia)} (${rotulo(parada.origem)})`),
            `<span class="num">${parada.diasParada}</span>`,
          ]),
        )
      : vazio('Nenhuma perícia parada.'),
  );
