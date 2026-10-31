import { laudoTipoDoPapel } from '@ethica/contracts';
import { dateInDisplayTz } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { PdfRenderer } from '../../providers/pdfRenderer.js';
import * as compromissoService from '../agenda/compromisso.service.js';
import * as accountService from '../identity/account.service.js';
import * as officeService from '../identity/office.service.js';
import type { PericiaRecord } from '../pericia/pericia.schema.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as prazoService from '../pericia/prazo.service.js';
import type { ArquivoGerado, DocumentoContexto } from './documentos.schema.js';
import { laudoDocx } from './laudo.docx.js';
import { pendenciasDe, resolverVariaveis, sanitizeLaudoHtml, type ValoresDoLaudo } from './laudo.html.js';
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

// Etapas anteriores à entrega: concluir com a entrega avança para `report_delivered` (AD-126).
const ANTES_DA_ENTREGA = new Set(['appointed', 'accepted', 'inspection', 'drafting_report']);

const comNumero = async <T extends { periciaId: string }>(tenantId: string, items: T[]): Promise<T[]> => {
  const resumos = await periciaService.findResumosByIds(tenantId, [...new Set(items.map((item) => item.periciaId))]);
  return items.map((item) => {
    const numero = resumos.get(item.periciaId)?.numeroProcesso;
    return numero ? { ...item, periciaNumero: numero } : item;
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
const dadosAtuais = async (providers: Pick<Providers, 'storage'>, ctx: DocumentoContexto, pericia: PericiaRecord) => {
  const [identity, perito, compromissos] = await Promise.all([
    officeService.getDocumentIdentity(providers.storage, ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
    compromissoService.listDaPericia(ctx.tenantId, pericia.id),
  ]);
  const valores = valoresDoLaudo({ pericia, perito, identity, compromissos, hoje: dateInDisplayTz(ctx.now) });
  return { identity, perito, valores };
};

const resolverSecoes = (secoes: LaudoSecaoRecord[], valores: ValoresDoLaudo): LaudoSecaoRecord[] =>
  secoes.map((secao) => ({
    ...secao,
    titulo: resolverVariaveis(secao.titulo, valores, 'texto'),
    html: resolverVariaveis(secao.html, valores, 'html'),
  }));

// Nenhum documento sai nem é concluído com marcador sem valor (AD-126).
const semPendencias = (secoes: LaudoSecaoRecord[]): void => {
  const pendentes = pendenciasDe(secoes);
  if (pendentes.length) {
    throw new CustomError('laudo_unresolved_variables', 422, pendentes.map((pendencia) => pendencia.secaoId).join(','));
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
  const pericia = await periciaService.getPericia(ctx.tenantId, laudo.periciaId);
  const { valores } = await dadosAtuais({}, ctx, pericia);
  const secoes = resolverSecoes(laudo.secoes, valores);
  return { ...laudo, secoes, pendencias: pendenciasDe(secoes) };
};

// LAU-02: copia as seções escolhidas, na ordem do modelo, com o texto da variante e as
// variáveis já resolvidas. O tipo vem do papel na perícia (LAU-06).
export const createLaudo = async (
  providers: Pick<Providers, 'storage'>,
  ctx: DocumentoContexto,
  data: CreateLaudo,
): Promise<LaudoRecord> => {
  const pericia = await periciaService.getPericia(ctx.tenantId, data.periciaId);
  const tipo = laudoTipoDoPapel(pericia.papel);
  const modelo = await modeloLaudoService.getModelo(ctx.tenantId, data.modeloId);
  if (modelo.tipo !== tipo) throw new CustomError('report_template_type_mismatch', 422);
  const variantes = new Map(data.secoes.map((escolha) => [escolha.id, escolha.variante]));
  const escolhidas = modelo.secoes.filter((secao) => variantes.has(secao.id));
  if (escolhidas.length !== variantes.size) throw new CustomError('invalid_data', 422, 'seção fora do modelo');
  const { valores } = await dadosAtuais(providers, ctx, pericia);
  const laudo = await laudoRepository.create({
    tenantId: ctx.tenantId,
    periciaId: pericia.id,
    userId: ctx.userId,
    tipo,
    titulo: tipo === 'technical_opinion' ? 'Parecer técnico' : 'Laudo pericial',
    modeloNome: modelo.nome,
    secoes: escolhidas.map((secao) => {
      const variante = variantes.get(secao.id) ?? 'yes';
      return {
        titulo: resolverVariaveis(secao.titulo, valores, 'texto'),
        nivel: secao.nivel,
        apenasTitulo: secao.apenasTitulo,
        quebraPagina: secao.quebraPagina,
        variante,
        html: secao.apenasTitulo
          ? ''
          : resolverVariaveis(variante === 'yes' ? secao.textoSim : secao.textoNao, valores, 'html'),
      };
    }),
  });
  return { ...laudo, periciaNumero: pericia.numeroProcesso };
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
  { registrarEntrega }: ConcluirLaudo,
): Promise<LaudoRecord> => {
  const laudo = await editavel(ctx.tenantId, id);
  const pericia = await periciaService.getPericia(ctx.tenantId, laudo.periciaId);
  const { valores } = await dadosAtuais(providers, ctx, pericia);
  const secoes = resolverSecoes(laudo.secoes, valores);
  semPendencias(secoes);
  encontrado(await laudoRepository.concluir(ctx.tenantId, id, ctx.userId, ctx.now, secoes));
  if (registrarEntrega) {
    await prazoService.protocolarEntregaDoLaudo(ctx.tenantId, pericia.id, ctx.now);
    await periciaService.addMovimentacao(ctx.tenantId, pericia.id, {
      tipo: 'report_filed',
      data: dateInDisplayTz(ctx.now),
      observacoes: `${laudo.titulo} concluído no Ethica.`,
    });
    if (ANTES_DA_ENTREGA.has(pericia.status)) {
      await periciaService.updatePericia(ctx.tenantId, pericia.id, { status: 'report_delivered' });
    }
  }
  return getLaudo(ctx.tenantId, id);
};

export const deleteLaudo = async (tenantId: string, id: string): Promise<void> => {
  await editavel(tenantId, id);
  const { deletedCount } = await laudoRepository.removeRascunho(tenantId, id);
  if (deletedCount === 0) throw new LaudoNotFoundError('not_found');
};

export const deleteByPericia = (tenantId: string, periciaId: string) =>
  laudoRepository.deleteByPericia(tenantId, periciaId);

// Exportar (LAU-03.2): mesmas variáveis resolvidas de novo, sem gravar; pendente → 422.
const paraExportar = async (providers: Providers, ctx: DocumentoContexto, id: string) => {
  const laudo = await getLaudo(ctx.tenantId, id);
  const pericia = await periciaService.getPericia(ctx.tenantId, laudo.periciaId);
  const { identity, perito, valores } = await dadosAtuais(providers, ctx, pericia);
  const secoes = resolverSecoes(laudo.secoes, valores);
  semPendencias(secoes);
  return { laudo: { ...laudo, secoes }, pericia, identity, perito, valores, geradoEm: ctx.now };
};

const nomeArquivo = (laudo: LaudoRecord, pericia: PericiaRecord, extensao: string): string =>
  `${laudo.tipo === 'technical_opinion' ? 'parecer-tecnico' : 'laudo'}-${pericia.numeroProcesso}.${extensao}`;

export const gerarPdf = async (providers: Providers, ctx: DocumentoContexto, id: string): Promise<ArquivoGerado> => {
  const dados = await paraExportar(providers, ctx, id);
  return {
    nome: nomeArquivo(dados.laudo, dados.pericia, 'pdf'),
    tipo: 'application/pdf',
    conteudo: await providers.pdf.render(laudoHtml(dados)),
  };
};

export const gerarDocx = async (providers: Providers, ctx: DocumentoContexto, id: string): Promise<ArquivoGerado> => {
  const dados = await paraExportar(providers, ctx, id);
  return {
    nome: nomeArquivo(dados.laudo, dados.pericia, 'docx'),
    tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    conteudo: await laudoDocx(dados),
  };
};
