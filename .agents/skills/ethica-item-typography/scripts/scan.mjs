#!/usr/bin/env node
// Varredura do padrão de tipografia (skill ethica-item-typography, AD-087).
//
// Regra: todo texto de tela usa <ItemTitle> ou <ItemDescription>. Classes
// locais nesses wrappers são permitidas; o scanner acusa tags cruas com texto.
//
//   raw     tag crua escrevendo texto. Para p, span, h1–h6, dt, dd, small, strong,
//           em, b, i, label, legend, a/Link e button: qualquer uma que contenha
//           texto (literal ou {expressão}) ou classe tipográfica. Para div e li:
//           só com texto literal ou classe tipográfica (div com {children} é
//           layout). Isentos: aria-hidden e sr-only.
//
// Uso:
//   node .agents/skills/ethica-item-typography/scripts/scan.mjs [caminhos...] [--json] [--summary]
// Sem caminhos, varre apps/web/src. Ignora testes e os primitivos listados em
// IGNORED_FILES (a tipografia interna deles É a identidade do componente).

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const summaryOnly = args.includes('--summary');
const targets = args.filter((arg) => !arg.startsWith('--'));
const roots = targets.length ? targets : ['apps/web/src'];

const IGNORED_FILES = [
  'apps/web/src/components/button.tsx',
  'apps/web/src/components/badge.tsx',
  'apps/web/src/components/mobile-dock.tsx',
  'apps/web/src/components/time12h.tsx',
];

// Tags cujo único propósito é texto: qualquer texto dentro é violação.
const TEXT_TAGS = new Set(['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dt', 'dd', 'small', 'strong', 'em', 'b', 'i', 'label', 'legend']);
// Tags de layout/ação: só violam com texto literal ou classe tipográfica.
const LAYOUT_TAGS = new Set(['div', 'li']);
// Links e botões crus com texto: use ItemTitle ou Button.
const ACTION_TAGS = new Set(['a', 'Link', 'button']);

// Classe tipográfica: tamanho, peso, família, entrelinha, espaçamento de letras,
// cor de texto, caixa, itálico, sublinhado, quebra e corte de linha, algarismos.
const TYPO = new RegExp(
  `^(?:[\\w-]+:)*(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|muted-foreground|foreground|primary|destructive|secondary-foreground|subtle-foreground|balance|pretty|wrap|nowrap|ellipsis|clip)(?:/\\S+)?|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|mono|sans|serif|italic)|leading-\\S+|tracking-\\S+|uppercase|lowercase|capitalize|italic|not-italic|underline|no-underline|decoration-\\S+|underline-offset-\\S+|truncate|line-clamp-\\S+|whitespace-\\S+|break-\\S+|wrap-\\S+|tabular-nums|slashed-zero)$`,
);

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  if (fs.statSync(dir).isFile()) {
    out.push(dir);
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    walk(path.join(dir, entry.name), out);
  }
  return out;
}

function isScannable(file) {
  const rel = path.relative(ROOT, file);
  if (!rel.endsWith('.tsx')) return false;
  if (rel.endsWith('.test.tsx')) return false;
  return !IGNORED_FILES.includes(rel);
}

// Fim de uma tag de abertura: '>' fora de aspas e chaves. Devolve também se é
// auto-fechada (`/>`).
function tagEnd(source, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return { end: i, selfClosing: source[i - 1] === '/' };
  }
  return { end: source.length - 1, selfClosing: true };
}

// Fecha `{ … }` respeitando aspas e aninhamento. Devolve o índice do '}'.
function braceEnd(source, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return source.length - 1;
}

// Corpo entre a abertura e o fechamento correspondente.
function bodyOf(source, tag, afterOpen) {
  const re = new RegExp(`<(/?)${tag.replace('.', '\\.')}(?=[\\s>/])`, 'g');
  re.lastIndex = afterOpen;
  let depth = 1;
  let m = re.exec(source);
  while (m) {
    if (m[1] === '/') {
      depth--;
      if (depth === 0) return source.slice(afterOpen, m.index);
    } else if (!tagEnd(source, m.index + m[0].length).selfClosing) depth++;
    m = re.exec(source);
  }
  return '';
}

// Texto direto do corpo: JSXText não vazio e {expressões} sem JSX dentro.
function textKinds(body) {
  let literal = false;
  let expression = false;
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '<') {
      if (body[i + 1] === '/') {
        depth--;
        i = body.indexOf('>', i);
        if (i < 0) break;
      } else {
        const m = /^<([A-Za-z][\w.]*)?/.exec(body.slice(i));
        const t = tagEnd(body, i + (m ? m[0].length : 1));
        if (!t.selfClosing) depth++;
        i = t.end;
      }
    } else if (ch === '{') {
      const end = braceEnd(body, i);
      const inner = body.slice(i + 1, end).trim();
      // `{children}` é conteúdo arbitrário, não texto.
      if (depth === 0 && inner && inner !== 'children' && !inner.startsWith('/*') && !inner.includes('<')) expression = true;
      i = end;
    } else if (depth === 0 && !/\s/.test(ch)) {
      literal = true;
    }
  }
  return { literal, expression };
}

function classTokens(tagText) {
  const m = tagText.match(/className=(\{[\s\S]*\}|"[^"]*"|'[^']*')/);
  if (!m) return [];
  const strings = m[1].match(/(["'`])((?:(?!\1)[\s\S])*)\1/g) ?? [];
  return strings.flatMap((s) => s.slice(1, -1).split(/\s+/)).filter(Boolean);
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

// Núcleo: analisa um arquivo e devolve as ocorrências (com índices, para o codemod).
export function scanSource(source, rel) {
  const findings = [];
  const re = /<([A-Za-z][\w.]*)(?=[\s>/])/g;
  let match = re.exec(source);
  while (match) {
    const tag = match[1];
    const start = match.index;
    const { end, selfClosing } = tagEnd(source, re.lastIndex);
    const openText = source.slice(start, end + 1);
    const tokens = classTokens(openText);
    const typo = tokens.filter((token) => TYPO.test(token));
    // `render={<Link …>texto</Link>}` num Button/BreadcrumbLink: o Link é o
    // próprio botão, que traz a tipografia dele.
    const asRenderProp = /render=\{\s*$/.test(source.slice(Math.max(0, start - 80), start));
    const exempt = /\baria-hidden\b/.test(openText) || tokens.includes('sr-only') || asRenderProp;
    const isRaw = TEXT_TAGS.has(tag) || LAYOUT_TAGS.has(tag) || ACTION_TAGS.has(tag);
    const base = { file: rel, line: lineOf(source, start), tag, classes: typo, start, openEnd: end, selfClosing };

    if (isRaw && !exempt) {
      const text = selfClosing ? { literal: false, expression: false } : textKinds(bodyOf(source, tag, end + 1));
      const hasText = TEXT_TAGS.has(tag) || ACTION_TAGS.has(tag) ? text.literal || text.expression : text.literal;
      // Link/button só acusam com texto: `text-muted-foreground` num botão de ícone colore o ícone.
      if (hasText || (typo.length && !selfClosing && !ACTION_TAGS.has(tag))) {
        findings.push({ ...base, kind: 'raw', text: text.literal ? 'literal' : text.expression ? 'expression' : 'none' });
      }
    }
    match = re.exec(source);
  }
  return findings;
}

export { bodyOf, braceEnd, classTokens, tagEnd, TYPO };

const isCli = process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;
if (isCli) {
  const findings = [];
  for (const root of roots) {
    for (const file of walk(path.resolve(ROOT, root), []).filter(isScannable)) {
      findings.push(...scanSource(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file)));
    }
  }
  const slim = findings.map(({ start, openEnd, selfClosing, ...rest }) => rest);
  if (asJson) {
    process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
  } else {
    const byFile = new Map();
    for (const finding of slim) byFile.set(finding.file, [...(byFile.get(finding.file) ?? []), finding]);
    if (!summaryOnly) {
      for (const [file, list] of byFile) {
        for (const f of list) console.log(`${file}:${f.line}  ${f.kind.padEnd(6)} <${f.tag}>  ${f.classes.join(' ')}`);
      }
      console.log('');
    }
    const raw = slim.filter((f) => f.kind === 'raw').length;
    console.log(`${byFile.size} arquivos · ${raw} raw`);
  }
}
