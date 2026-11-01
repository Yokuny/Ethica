import { reportRoleType } from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import * as appointmentService from '../agenda/appointment.service.js';
import * as inspectionService from '../agenda/inspection.service.js';
import type { CaseRecord } from '../case/case.schema.js';
import * as caseService from '../case/case.service.js';
import * as deadlineService from '../case/deadline.service.js';
import * as accountService from '../identity/account.service.js';
import * as officeService from '../identity/office.service.js';
import type { DocumentoContexto, GeneratedFile } from './documentos.schema.js';
import { laudoDocx } from './laudo.docx.js';
import { pendenciasDe, resolveVariables, sanitizeLaudoHtml, type ValoresDoLaudo } from './laudo.html.js';
import * as laudoRepository from './laudo.repository.js';
import type {
  ConcluirLaudo,
  CreateLaudo,
  LaudoListItem,
  LaudoRecord,
  LaudoSecaoRecord,
  ListLaudosQuery,
  UpdateLaudoSecao,
} from './laudo.schema.js';
import { laudoHtml } from './laudo.templates.js';
import { valoresDoLaudo } from './laudo.variaveis.js';
import * as modeloLaudoService from './modeloLaudo.service.js';

export class LaudoNotFoundError extends KeyedError {}

type Providers = { pdf: PdfRenderer; storage?: FileStorage };

// Etapas anteriores à entrega: concluir com a entrega avança para `report_delivered` (AD-126)
// com a fase "aguardando manifestação das partes" (AD-133).
const BEFORE_DELIVERY = new Set(['appointed', 'accepted', 'inspection', 'drafting_report']);

const comNumero = async <T extends { caseId: string }>(tenantId: string, items: T[]): Promise<T[]> => {
  const resumos = await caseService.findResumosByIds(tenantId, [...new Set(items.map((item) => item.caseId))]);
  return items.map((item) => {
    const numero = resumos.get(item.caseId)?.processNumber;
    return numero ? { ...item, caseNumber: numero } : item;
  });
};

const encontrado = (laudo: LaudoRecord | null): LaudoRecord => {
  if (!laudo) throw new LaudoNotFoundError('not_found');
  return laudo;
};

const editavel = async (tenantId: string, id: string): Promise<LaudoRecord> => {
  const laudo = encontrado(await laudoRepository.findById(tenantId, id));
  if (laudo.status === 'completed') throw new CustomError('report_completed', 409);
  return laudo;
};

// Dados da perícia, de quem gera e do escritório no momento (AD-126).
const dadosAtuais = async (providers: Pick<Providers, 'storage'>, ctx: DocumentoContexto, legalCase: CaseRecord) => {
  const [identity, expert, appointments, field] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
    appointmentService.listByCase(ctx.tenantId, legalCase.id),
    inspectionService.lastDoneByCase(ctx.tenantId, legalCase.id),
  ]);
  const valores = valoresDoLaudo({
    legalCase,
    expert,
    identity,
    appointments,
    field: field && { dados: field.inspection.dados, inicio: field.appointment.inicio },
    today: dateInDisplayTz(ctx.now),
  });
  return { identity, expert, valores };
};

const resolveSections = (secoes: LaudoSecaoRecord[], valores: ValoresDoLaudo): LaudoSecaoRecord[] =>
  secoes.map((secao) => ({
    ...secao,
    titulo: resolveVariables(secao.titulo, valores, 'texto'),
    html: resolveVariables(secao.html, valores, 'html'),
  }));

// Nenhum documento sai nem é concluído com marcador sem valor (AD-126).
const semPendencias = (secoes: LaudoSecaoRecord[]): void => {
  const pending = pendenciasDe(secoes);
  if (pending.length) {
    throw new CustomError('laudo_unresolved_variables', 422, pending.map((pendencia) => pendencia.secaoId).join(','));
  }
};

export const listLaudos = async (
  tenantId: string,
  query: ListLaudosQuery,
): Promise<{ items: LaudoListItem[]; total: number }> => {
  const result = await laudoRepository.list(tenantId, query);
  return { ...result, items: await comNumero(tenantId, result.items) };
};

const getLaudo = async (tenantId: string, id: string): Promise<LaudoRecord> => {
  const [laudo] = await comNumero(tenantId, [encontrado(await laudoRepository.findById(tenantId, id))]);
  return laudo as LaudoRecord;
};

// Abrir o rascunho resolve de novo as variáveis com os dados atuais, sem gravar: a tela mostra
// o mesmo texto e as mesmas pendências que a exportação e a conclusão vão usar (AD-126). Salvar
// a seção grava o texto já resolvido; o concluído é devolvido como foi gravado.
export const abrirLaudo = async (ctx: DocumentoContexto, id: string): Promise<LaudoRecord> => {
  const laudo = await getLaudo(ctx.tenantId, id);
  if (laudo.status === 'completed') return laudo;
  const legalCase = await caseService.getCase(ctx.tenantId, laudo.caseId);
  const { valores } = await dadosAtuais({}, ctx, legalCase);
  const secoes = resolveSections(laudo.secoes, valores);
  return { ...laudo, secoes, pendencias: pendenciasDe(secoes) };
};

// LAU-02: copia as seções escolhidas, na ordem do modelo, com o texto da variante e as
// variáveis já resolvidas. O tipo vem do papel na perícia (LAU-06).
export const createLaudo = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentoContexto,
  data: CreateLaudo,
): Promise<LaudoRecord> => {
  const legalCase = await caseService.getCase(ctx.tenantId, data.caseId);
  const tipo = reportRoleType(legalCase.role);
  const modelo = await modeloLaudoService.getModelo(ctx.tenantId, data.modeloId);
  if (modelo.tipo !== tipo) throw new CustomError('report_template_type_mismatch', 422);
  const variantes = new Map(data.secoes.map((escolha) => [escolha.id, escolha.variante]));
  const escolhidas = modelo.secoes.filter((secao) => variantes.has(secao.id));
  if (escolhidas.length !== variantes.size) throw new CustomError('invalid_data', 422, 'seção fora do modelo');
  const { valores } = await dadosAtuais(providers, ctx, legalCase);
  const laudo = await laudoRepository.create({
    tenantId: ctx.tenantId,
    caseId: legalCase.id,
    userId: ctx.userId,
    tipo,
    titulo: tipo === 'technical_opinion' ? 'Parecer técnico' : 'Laudo pericial',
    modeloNome: modelo.nome,
    secoes: escolhidas.map((secao) => {
      const variante = variantes.get(secao.id) ?? 'yes';
      return {
        titulo: resolveVariables(secao.titulo, valores, 'texto'),
        nivel: secao.nivel,
        apenasTitulo: secao.apenasTitulo,
        quebraPagina: secao.quebraPagina,
        variante,
        html: secao.apenasTitulo
          ? ''
          : resolveVariables(variante === 'yes' ? secao.textoSim : secao.textoNao, valores, 'html'),
      };
    }),
  });
  return { ...laudo, caseNumber: legalCase.processNumber };
};

export const updateSecao = async (
  ctx: DocumentoContexto,
  id: string,
  secaoId: string,
  data: UpdateLaudoSecao,
): Promise<LaudoRecord> => {
  const { tenantId } = ctx;
  await editavel(tenantId, id);
  const updated = await laudoRepository.updateSecao(tenantId, id, secaoId, {
    titulo: data.titulo,
    html: data.html === undefined ? undefined : sanitizeLaudoHtml(data.html),
  });
  return abrirLaudo(ctx, encontrado(updated).id);
};

// Remover renumera sozinho: o número vem da posição (AD-126). A última seção fica.
export const removeSecao = async (ctx: DocumentoContexto, id: string, secaoId: string): Promise<LaudoRecord> => {
  const { tenantId } = ctx;
  const laudo = await editavel(tenantId, id);
  if (!laudo.secoes.some((secao) => secao.id === secaoId)) throw new LaudoNotFoundError('not_found');
  if (laudo.secoes.length === 1) throw new CustomError('report_needs_section', 422);
  encontrado(await laudoRepository.removeSecao(tenantId, id, secaoId));
  return abrirLaudo(ctx, id);
};

// LAU-03.4: resolve de novo com os dados atuais, grava o texto final e bloqueia a edição.
// Com a entrega: protocola o prazo, lança a movimentação e avança a etapa (AD-126).
export const concluirLaudo = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentoContexto,
  id: string,
  { recordDelivery }: ConcluirLaudo,
): Promise<LaudoRecord> => {
  const laudo = await editavel(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, laudo.caseId);
  const { valores } = await dadosAtuais(providers, ctx, legalCase);
  const secoes = resolveSections(laudo.secoes, valores);
  semPendencias(secoes);
  encontrado(await laudoRepository.concluir(ctx.tenantId, id, ctx.userId, ctx.now, secoes));
  if (recordDelivery) {
    await deadlineService.fileReportDelivery(ctx.tenantId, legalCase.id, ctx.now);
    await caseService.addMovement(ctx.tenantId, legalCase.id, {
      tipo: 'report_filed',
      data: dateInDisplayTz(ctx.now),
      observacoes: `${laudo.titulo} concluído no Ethica.`,
    });
    if (BEFORE_DELIVERY.has(legalCase.status)) {
      await caseService.updateCase(ctx.tenantId, legalCase.id, {
        status: 'report_delivered',
        phase: 'awaiting_objections',
      });
    }
  }
  return getLaudo(ctx.tenantId, id);
};

export const deleteLaudo = async (tenantId: string, id: string): Promise<void> => {
  await editavel(tenantId, id);
  const { deletedCount } = await laudoRepository.removeDraft(tenantId, id);
  if (deletedCount === 0) throw new LaudoNotFoundError('not_found');
};

export const deleteByCase = (tenantId: string, caseId: string) => laudoRepository.deleteByCase(tenantId, caseId);

// Exportar (LAU-03.2): mesmas variáveis resolvidas de novo, sem gravar; pendente → 422.
const paraExportar = async (providers: Providers, ctx: DocumentoContexto, id: string) => {
  const laudo = await getLaudo(ctx.tenantId, id);
  const legalCase = await caseService.getCase(ctx.tenantId, laudo.caseId);
  const { identity, expert, valores } = await dadosAtuais(providers, ctx, legalCase);
  const secoes = resolveSections(laudo.secoes, valores);
  semPendencias(secoes);
  // Fotos da vistoria no texto (AD-129): bytes lidos aqui, só do próprio tenant.
  const srcs = [
    ...new Set(
      secoes.flatMap((secao) => [...secao.html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1] as string)),
    ),
  ];
  const lidas = await Promise.all(
    srcs.map(
      async (src) => [src, await inspectionService.readReportPhoto(providers.storage, ctx.tenantId, src)] as const,
    ),
  );
  const photos = Object.fromEntries(lidas.flatMap(([src, photo]) => (photo ? [[src, photo]] : [])));
  return { laudo: { ...laudo, secoes }, legalCase, identity, expert, valores, photos, geradoEm: ctx.now };
};

const fileName = (laudo: LaudoRecord, legalCase: CaseRecord, extensao: string): string =>
  `${laudo.tipo === 'technical_opinion' ? 'technical-opinion' : 'laudo'}-${legalCase.processNumber}.${extensao}`;

export const gerarPdf = async (providers: Providers, ctx: DocumentoContexto, id: string): Promise<GeneratedFile> => {
  const dados = await paraExportar(providers, ctx, id);
  return {
    nome: fileName(dados.laudo, dados.legalCase, 'pdf'),
    tipo: 'application/pdf',
    conteudo: await providers.pdf.render(laudoHtml(dados)),
  };
};

export const gerarDocx = async (providers: Providers, ctx: DocumentoContexto, id: string): Promise<GeneratedFile> => {
  const dados = await paraExportar(providers, ctx, id);
  return {
    nome: fileName(dados.laudo, dados.legalCase, 'docx'),
    tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    conteudo: await laudoDocx(dados),
  };
};
