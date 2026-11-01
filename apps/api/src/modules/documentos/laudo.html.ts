import type { LaudoVariavel } from '@ethica/contracts';
import { LAUDO_HTML_TAGS, LAUDO_IMG_SRC, LAUDO_VARIAVEIS, variaveisPendentes } from '@ethica/contracts';
import sanitizeHtml from 'sanitize-html';
import { esc } from './documento.layout.js';

// Todo HTML do laudo e dos modelos passa por aqui antes de ser gravado (AD-123): só as tags
// que o editor produz e que o PDF e o Word sabem desenhar; atributo, só colspan/rowspan e o
// `src`/`alt` da foto. Tag fora da lista some e o texto dela fica; script e style somem com o
// conteúdo. Foto só da vistoria (AD-129): o editor grava a URL absoluta da API, aqui fica o
// caminho; qualquer outra imagem é removida.
export const sanitizeLaudoHtml = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: [...LAUDO_HTML_TAGS],
    allowedAttributes: { th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'], img: ['src', 'alt'] },
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: (attribs.src ?? '').replace(/^https?:\/\/[^/]+/, '') },
      }),
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !LAUDO_IMG_SRC.test(frame.attribs.src ?? ''),
  }).trim();

export type ValoresDoLaudo = Partial<Record<LaudoVariavel, string>>;

// Troca só os marcadores que têm valor; o que fica é pendência (AD-126). No HTML o valor é
// escapado; no título (texto simples) vai cru e é escapado na hora de desenhar.
export const resolverVariaveis = (texto: string, valores: ValoresDoLaudo, formato: 'html' | 'texto'): string =>
  LAUDO_VARIAVEIS.reduce((resultado, variavel) => {
    const valor = valores[variavel]?.trim();
    if (!valor) return resultado;
    return resultado.replaceAll(variavel, formato === 'html' ? esc(valor) : valor);
  }, texto);

// Marcadores ainda sem valor, por seção (título e texto): bloqueiam exportar e concluir (AD-126).
export const pendenciasDe = (secoes: ReadonlyArray<{ id: string; titulo: string; html: string }>) =>
  secoes
    .map((secao) => ({ secaoId: secao.id, variaveis: variaveisPendentes(`${secao.titulo} ${secao.html}`) }))
    .filter((pendencia) => pendencia.variaveis.length > 0);
