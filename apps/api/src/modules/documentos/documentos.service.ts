import { dateInDisplayTz } from '@ethica/db';
import { strToU8, zipSync } from 'fflate';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfDocument, PdfRenderer } from '../../providers/pdfRenderer.js';
import * as compromissoService from '../agenda/compromisso.service.js';
import * as lancamentoService from '../financeiro/lancamento.service.js';
import * as accountService from '../identity/account.service.js';
import * as authService from '../identity/auth.service.js';
import * as officeService from '../identity/office.service.js';
import * as parteService from '../pericia/parte.service.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as prazoService from '../pericia/prazo.service.js';
import * as oportunidadeService from '../prospeccao/oportunidade.service.js';
import type { ArquivoGerado, DocumentoBase, DocumentoContexto, FinanceiroReportQuery } from './documentos.schema.js';
import { checklistHtml, cronogramaHtml, fichaHtml, financeiroHtml, paradasHtml } from './documentos.templates.js';

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

const base = async (providers: Providers, ctx: DocumentoContexto): Promise<DocumentoBase> => {
  const [identity, perito] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
  ]);
  return { identity, perito, geradoEm: ctx.now };
};

const pdf = async (providers: Providers, nome: string, documento: PdfDocument): Promise<ArquivoGerado> => ({
  nome,
  tipo: 'application/pdf',
  conteudo: await providers.pdf.render(documento),
});

// DOC-02: o resumo financeiro só entra para admin/manager (AD-107).
export const gerarFicha = async (providers: Providers, ctx: DocumentoContexto, periciaId: string) => {
  const pericia = await periciaService.getPericia(ctx.tenantId, periciaId);
  const [dadosBase, prazos, compromissos, financeiro] = await Promise.all([
    base(providers, ctx),
    prazoService.listPrazosDaPericia(ctx.tenantId, periciaId),
    compromissoService.listDaPericia(ctx.tenantId, periciaId),
    ctx.canSeeFinance ? lancamentoService.resumoDaPericia(ctx.tenantId, periciaId) : undefined,
  ]);
  return pdf(
    providers,
    `ficha-${pericia.numeroProcesso}.pdf`,
    fichaHtml({ ...dadosBase, pericia, prazos, compromissos, financeiro }),
  );
};

export const gerarChecklist = async (providers: Providers, ctx: DocumentoContexto, periciaId: string) => {
  const pericia = await periciaService.getPericia(ctx.tenantId, periciaId);
  return pdf(
    providers,
    `checklist-${pericia.numeroProcesso}.pdf`,
    checklistHtml({ ...(await base(providers, ctx)), pericia }),
  );
};

export const gerarCronograma = async (providers: Providers, ctx: DocumentoContexto) => {
  const [dadosBase, prazos] = await Promise.all([base(providers, ctx), prazoService.listPrazosPendentes(ctx.tenantId)]);
  return pdf(
    providers,
    'cronograma-de-prazos.pdf',
    cronogramaHtml({ ...dadosBase, prazos, hoje: dateInDisplayTz(ctx.now) }),
  );
};

export const gerarFinanceiro = async (providers: Providers, ctx: DocumentoContexto, periodo: FinanceiroReportQuery) => {
  const [dadosBase, relatorio] = await Promise.all([
    base(providers, ctx),
    lancamentoService.relatorioPeriodo(ctx.tenantId, periodo),
  ]);
  return pdf(
    providers,
    `relatorio-financeiro-${periodo.from}-a-${periodo.to}.pdf`,
    financeiroHtml({ ...dadosBase, periodo, relatorio }),
  );
};

export const gerarParadas = async (providers: Providers, ctx: DocumentoContexto) => {
  const [dadosBase, paradas] = await Promise.all([
    base(providers, ctx),
    periciaService.listParadas(ctx.tenantId, ctx.now),
  ]);
  return pdf(providers, 'pericias-paradas.pdf', paradasHtml({ ...dadosBase, paradas }));
};

// CSV da exportação (AD-122): mesmo formato da importação (`;`, UTF-8 com BOM, AD-115).
type Celula = string | number | boolean | Date | undefined | null;
const celula = (value: Celula): string => {
  const texto = value instanceof Date ? value.toISOString() : String(value ?? '');
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};
export const toCsv = <T>(colunas: Array<[string, (item: T) => Celula]>, itens: T[]): string =>
  `﻿${[colunas.map(([nome]) => nome), ...itens.map((item) => colunas.map(([, valor]) => valor(item)))]
    .map((linha) => linha.map((valor) => celula(valor as Celula)).join(';'))
    .join('\r\n')}\r\n`;

// DOC-04: um CSV por entidade do tenant num ZIP; registra quem exportou e quando.
export const exportarDados = async (ctx: DocumentoContexto): Promise<ArquivoGerado> => {
  const { tenantId } = ctx;
  const [pericias, partes, prazos, compromissos, lancamentos, usuarios, oportunidades] = await Promise.all([
    periciaService.listForExport(tenantId),
    parteService.listForExport(tenantId),
    prazoService.listForExport(tenantId),
    compromissoService.listForExport(tenantId),
    lancamentoService.listForExport(tenantId),
    authService.listUserDirectory(tenantId),
    oportunidadeService.listForExport(tenantId),
  ]);
  const arquivos = {
    'pericias.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['numeroProcesso', (p) => p.numeroProcesso],
        ['justica', (p) => p.justica],
        ['papel', (p) => p.papel],
        ['tribunal', (p) => p.tribunal],
        ['vara', (p) => p.vara],
        ['comarca', (p) => p.comarca],
        ['objeto', (p) => p.objeto],
        ['status', (p) => p.status],
        ['partes', (p) => p.partes.map((parte) => `${parte.polo}:${parte.tipo}:${parte.nome}`).join(' | ')],
        ['dataNomeacao', (p) => p.dataNomeacao],
        ['honorariosPropostosCents', (p) => p.honorariosPropostosCents],
        ['honorariosFixadosCents', (p) => p.honorariosFixadosCents],
        ['dataAutuacao', (p) => p.dataAutuacao],
        ['dataAdmissao', (p) => p.dataAdmissao],
        ['dataDemissao', (p) => p.dataDemissao],
        ['funcaoReclamante', (p) => p.funcaoReclamante],
        ['periodoImprescritoInicio', (p) => p.periodoImprescritoInicio],
        ['periodoImprescritoFim', (p) => p.periodoImprescritoFim],
        ['localPericia', (p) => p.localPericia],
        ['movimentacoes', (p) => p.movimentacoes.map((m) => `${m.data}:${m.tipo}`).join(' | ')],
        ['observacoes', (p) => p.observacoes],
        ['createdAt', (p) => p.createdAt],
      ],
      pericias,
    ),
    'partes.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['tipo', (p) => p.tipo],
        ['nome', (p) => p.nome],
        ['documento', (p) => p.documento],
        ['oab', (p) => p.oab],
        ['email', (p) => p.email],
        ['telefone', (p) => p.telefone],
        ['createdAt', (p) => p.createdAt],
      ],
      partes,
    ),
    'prazos.csv': toCsv(
      [
        ['id', (p) => p.id],
        ['periciaId', (p) => p.periciaId],
        ['titulo', (p) => p.titulo],
        ['vencimento', (p) => p.vencimento],
        ['status', (p) => p.status],
        ['protocoladoEm', (p) => p.protocoladoEm],
        ['observacoes', (p) => p.observacoes],
      ],
      prazos,
    ),
    'compromissos.csv': toCsv(
      [
        ['id', (c) => c.id],
        ['periciaId', (c) => c.periciaId],
        ['tipo', (c) => c.tipo],
        ['titulo', (c) => c.titulo],
        ['inicio', (c) => c.inicio],
        ['fim', (c) => c.fim],
        ['local', (c) => c.local],
        ['status', (c) => c.status],
        ['origem', (c) => c.origem],
        ['observacoes', (c) => c.observacoes],
      ],
      compromissos,
    ),
    'lancamentos.csv': toCsv(
      [
        ['id', (l) => l.id],
        ['periciaId', (l) => l.periciaId],
        ['natureza', (l) => l.natureza],
        ['categoria', (l) => l.categoria],
        ['descricao', (l) => l.descricao],
        ['valorCents', (l) => l.valorCents],
        ['vencimento', (l) => l.vencimento],
        ['status', (l) => l.status],
        ['liquidadoEm', (l) => l.liquidadoEm],
        ['recebidoCents', (l) => l.recebidoCents],
        ['parcelas', (l) => l.parcelas.map((p) => `${p.data}:${p.valorCents}`).join(' | ')],
      ],
      lancamentos,
    ),
    // Sem senha, sem hashes de sessão ou do feed (AD-122).
    'usuarios.csv': toCsv(
      [
        ['id', (u) => u.id],
        ['name', (u) => u.name],
        ['email', (u) => u.email],
        ['role', (u) => u.role.join(' | ')],
        ['active', (u) => u.active],
        ['createdAt', (u) => u.createdAt],
      ],
      usuarios,
    ),
    'oportunidades.csv': toCsv(
      [
        ['id', (o) => o.id],
        ['numeroProcesso', (o) => o.numeroProcesso],
        ['tribunal', (o) => o.tribunal],
        ['classe', (o) => o.classe],
        ['assuntos', (o) => o.assuntos.join(' | ')],
        ['orgaoJulgador', (o) => o.orgaoJulgador],
        ['status', (o) => o.status],
        ['periciaId', (o) => o.periciaId],
        ['observacoes', (o) => o.observacoes],
        ['createdAt', (o) => o.createdAt],
      ],
      oportunidades,
    ),
  };
  const zip = zipSync(Object.fromEntries(Object.entries(arquivos).map(([nome, csv]) => [nome, strToU8(csv)])));
  return {
    nome: `ethica-dados-${dateInDisplayTz(ctx.now)}.zip`,
    tipo: 'application/zip',
    conteudo: Buffer.from(zip),
  };
};
