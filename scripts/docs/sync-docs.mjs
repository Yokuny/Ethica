#!/usr/bin/env node
// Gera o gateway de documentação (docs/index.md + docs/index.json) a partir do
// frontmatter de docs/features/*/feature.md, do log de decisões em .specs/STATE.md,
// das pastas em .specs/features/ e dos planos em .specs/plans/ (caixa de entrada) e
// .specs/features/*/plans/ (arquivados). Node puro, sem dependências.
//
// Uso:
//   node scripts/docs/sync-docs.mjs            # regrava os índices
//   node scripts/docs/sync-docs.mjs --check    # não escreve; exit 1 se divergir ou houver erro
//   node scripts/docs/sync-docs.mjs --context  # resumo curto para o início de sessão (hook)

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS_DIR = join(ROOT, 'docs');
const FEATURES_DIR = join(DOCS_DIR, 'features');
const SPECS_DIR = join(ROOT, '.specs', 'features');
const PLANS_INBOX = join(ROOT, '.specs', 'plans');
const STATE_PATH = join(ROOT, '.specs', 'STATE.md');
const INDEX_MD = join(DOCS_DIR, 'index.md');
const INDEX_JSON = join(DOCS_DIR, 'index.json');

const STATUS = ['planejado', 'em-andamento', 'parcial', 'concluido', 'revertido'];
const REQUIRED_FIELDS = ['feature', 'slug', 'descricao', 'data', 'status', 'areas'];
const REQUIRED_SECTIONS = [
  '## O que foi feito',
  '## Por que',
  '## Como',
  '## Como testar',
  '## Pendências',
  '## Histórico',
];
// Áreas fora dos workspaces pnpm que uma feature pode tocar.
const EXTRA_AREAS = ['infra', 'docs', 'evals', 'tests', 'harness'];

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const contextOnly = args.includes('--context');

const rel = (p) => relative(ROOT, p);

// ---------- frontmatter (plano: `chave: valor`, listas inline `[a, b]`) ----------

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  let key = null;
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      fields[key] = kv[2].trim();
    } else if (key && line.trim()) {
      fields[key] += ` ${line.trim()}`;
    }
  }
  return fields;
}

function asList(value) {
  if (!value) return [];
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const firstHeading = (raw) =>
  raw
    .split('\n')
    .find((l) => l.startsWith('# '))
    ?.slice(2)
    .trim() ?? null;

const listDirs = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .sort()
        .filter((name) => statSync(join(dir, name)).isDirectory())
    : [];

const listMd = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .sort()
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
    : [];

// ---------- fontes ----------

function knownAreas() {
  const areas = new Set(EXTRA_AREAS);
  for (const group of ['apps', 'packages']) {
    for (const name of listDirs(join(ROOT, group))) areas.add(`${group}/${name}`);
  }
  return areas;
}

function readDecisions() {
  if (!existsSync(STATE_PATH)) return [];
  const raw = readFileSync(STATE_PATH, 'utf8');
  const decisions = [];
  const blocks = raw.split(/^### (?=AD-\d+)/m).slice(1);
  for (const block of blocks) {
    const id = block.match(/^(AD-\d+)/)[1];
    const decision = block.match(/\*\*Decision\*\*:\s*(.+)/)?.[1] ?? '';
    const date = block.match(/\*\*Date\*\*:\s*(\S+)/)?.[1] ?? '';
    const status = block.match(/\*\*Status\*\*:\s*(.+)/)?.[1]?.trim() ?? '';
    decisions.push({ id, decisao: decision.replace(/\*\*/g, '').slice(0, 140).trimEnd(), data: date, status });
  }
  return decisions;
}

function readPlansInbox() {
  return listMd(PLANS_INBOX).map((file) => {
    const path = join(PLANS_INBOX, file);
    return {
      arquivo: rel(path),
      titulo: firstHeading(readFileSync(path, 'utf8')) ?? file,
    };
  });
}

function readFeatures(areas, decisionIds, errors) {
  const features = [];
  for (const slug of listDirs(FEATURES_DIR)) {
    const file = join(FEATURES_DIR, slug, 'feature.md');
    const fail = (msg) => errors.push(`${rel(file)}: ${msg}`);
    if (!existsSync(file)) {
      errors.push(`docs/features/${slug}/: falta feature.md (cp docs/templates/feature-doc.md ${rel(file)})`);
      continue;
    }
    const raw = readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) {
      fail('frontmatter ausente.');
      continue;
    }
    const missing = REQUIRED_FIELDS.filter((k) => !fm[k]);
    if (missing.length) {
      fail(`campo(s) obrigatório(s) ausente(s): ${missing.join(', ')}.`);
      continue;
    }
    if (fm.slug !== slug) fail(`slug "${fm.slug}" difere do nome da pasta "${slug}".`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.data)) fail(`data "${fm.data}" não é YYYY-MM-DD.`);
    if (!STATUS.includes(fm.status)) fail(`status "${fm.status}" inválido — use: ${STATUS.join(' | ')}.`);
    if (fm.descricao.length > 140) fail(`descricao com ${fm.descricao.length} caracteres (máx. 140).`);

    const featureAreas = asList(fm.areas);
    if (!featureAreas.length) fail('areas vazio.');
    for (const a of featureAreas) {
      if (!areas.has(a))
        fail(`área desconhecida "${a}" — use um workspace (apps/x, packages/x) ou ${EXTRA_AREAS.join('/')}.`);
    }

    const decisoes = asList(fm.decisoes);
    for (const d of decisoes) {
      if (!decisionIds.has(d)) fail(`decisão "${d}" não existe em .specs/STATE.md.`);
    }

    const specs = asList(fm.spec);
    for (const s of specs) {
      if (!existsSync(join(ROOT, s))) fail(`spec "${s}" não existe.`);
    }

    for (const section of REQUIRED_SECTIONS) {
      if (!raw.includes(`\n${section}`)) fail(`seção obrigatória ausente: "${section}".`);
    }

    const specDir = join(SPECS_DIR, slug);
    const plans = listMd(join(specDir, 'plans')).map((f) => `.specs/features/${slug}/plans/${f}`);

    features.push({
      slug,
      feature: fm.feature,
      descricao: fm.descricao,
      data: fm.data,
      status: fm.status,
      areas: featureAreas,
      decisoes,
      spec: specs,
      planos: plans,
      doc: `features/${slug}/feature.md`,
    });
  }
  // mais recentes primeiro; desempate por slug para saída determinística
  return features.sort((a, b) => b.data.localeCompare(a.data) || a.slug.localeCompare(b.slug));
}

// ---------- geração ----------

const cell = (s) => String(s).replace(/\|/g, '\\|');

function renderIndexMd({ features, decisions, inbox, specsSemDoc, areas }) {
  const out = [];
  out.push('<!-- GERADO por scripts/docs/sync-docs.mjs — não edite à mão. Rode `pnpm docs:sync`. -->');
  out.push('');
  out.push('# Gateway de documentação — Ethica');
  out.push('');
  out.push('Ponto de entrada obrigatório antes de qualquer tarefa (protocolo em [`AGENTS.md`](../AGENTS.md)).');
  out.push('Cada feature tem **um** registro vivo em `docs/features/<slug>/feature.md`; spec, design, tasks,');
  out.push('validação e planos (congelados) ficam em `.specs/features/<slug>/`. Decisões: `.specs/STATE.md`.');
  out.push('');

  const ativos = features.filter(
    (f) => f.status === 'em-andamento' || f.status === 'parcial' || f.status === 'planejado',
  );
  out.push('## Em andamento');
  out.push('');
  if (!ativos.length) out.push('_Nada em andamento._');
  for (const f of ativos) out.push(`- [\`${f.slug}\`](${f.doc}) — **${f.status}** — ${f.descricao}`);
  out.push('');

  out.push('## Planos não arquivados (`.specs/plans/`)');
  out.push('');
  if (!inbox.length) out.push('_Nenhum._');
  for (const p of inbox) out.push(`- [${cell(p.titulo)}](../${p.arquivo})`);
  out.push('');

  out.push(`## Features (${features.length})`);
  out.push('');
  out.push('| Feature | O que faz | Status | Atualizado | Áreas | Spec | Planos |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const f of features) {
    const spec = f.spec.length ? f.spec.map((s) => `[spec](../${s})`).join(' ') : '—';
    out.push(
      `| [${cell(f.feature)}](${f.doc}) | ${cell(f.descricao)} | ${f.status} | ${f.data} | ${f.areas.map((a) => `\`${a}\``).join(' ')} | ${spec} | ${f.planos.length || '—'} |`,
    );
  }
  out.push('');

  out.push('## Por área');
  out.push('');
  for (const area of [...areas].sort()) {
    const list = features.filter((f) => f.areas.includes(area));
    if (!list.length) continue;
    out.push(`- **\`${area}\`** — ${list.map((f) => `[${f.slug}](${f.doc})`).join(', ')}`);
  }
  out.push('');

  out.push('## Decisões recentes');
  out.push('');
  out.push(
    'Últimas 10 de [`.specs/STATE.md`](../.specs/STATE.md#decisions) (ADRs longos em [`docs/adr/`](adr/README.md)).',
  );
  out.push('');
  for (const d of decisions.slice(-10).reverse()) {
    out.push(`- **${d.id}** (${d.data || 's/ data'}, ${d.status || 's/ status'}) — ${cell(d.decisao)}`);
  }
  out.push('');

  if (specsSemDoc.length) {
    out.push('## `.specs/` sem registro em `docs/features/`');
    out.push('');
    for (const s of specsSemDoc) out.push(`- \`.specs/features/${s}/\``);
    out.push('');
  }

  out.push('## Outros documentos');
  out.push('');
  out.push(
    '- [Arquitetura](architecture.md) · [Glossário](glossary.md) · [Roadmap](roadmap.md) · [Posicionamento](positioning.md) · [ADRs](adr/README.md)',
  );
  out.push('- Produto: [`PRODUCT.md`](../PRODUCT.md) · Operação local: [`RUN_BOOK.md`](../RUN_BOOK.md)');
  out.push('- Template de registro: [`docs/templates/feature-doc.md`](templates/feature-doc.md)');
  out.push('');
  return out.join('\n');
}

function renderContext({ features, inbox, specsSemDoc, errors }) {
  const out = ['[docs] Gateway: docs/index.md · protocolo: AGENTS.md (descoberta → spec/plan → registro).'];
  const ativos = features.filter((f) => ['em-andamento', 'parcial', 'planejado'].includes(f.status));
  if (ativos.length) out.push(`[docs] Em andamento: ${ativos.map((f) => `${f.slug} (${f.status})`).join(', ')}`);
  out.push(
    `[docs] Últimas atualizadas: ${features
      .slice(0, 6)
      .map((f) => `${f.slug} ${f.data}`)
      .join(', ')}`,
  );
  if (inbox.length)
    out.push(
      `[docs] Planos não arquivados em .specs/plans/: ${inbox.map((p) => p.arquivo.split('/').pop()).join(', ')}`,
    );
  if (specsSemDoc.length) out.push(`[docs] .specs sem feature.md: ${specsSemDoc.join(', ')}`);
  if (errors.length) out.push(`[docs] ${errors.length} erro(s) de validação — rode pnpm docs:check.`);
  out.push(
    '[docs] Antes de implementar: leia o feature.md e os planos/specs das features relacionadas. Ao concluir: skill crm-docs.',
  );
  return out.join('\n');
}

// ---------- main ----------

const errors = [];
const areas = knownAreas();
const decisions = readDecisions();
const decisionIds = new Set(decisions.map((d) => d.id));
const features = readFeatures(areas, decisionIds, errors);
const inbox = readPlansInbox();
const documented = new Set(features.flatMap((f) => f.spec.map((s) => s.replace(/\/$/, '').split('/').pop())));
const specsSemDoc = listDirs(SPECS_DIR).filter((s) => !documented.has(s) && !features.some((f) => f.slug === s));

if (contextOnly) {
  console.log(renderContext({ features, inbox, specsSemDoc, errors }));
  process.exit(0);
}

const indexMd = renderIndexMd({ features, decisions, inbox, specsSemDoc, areas });
const indexJson = `${JSON.stringify(
  {
    gerado_por: 'scripts/docs/sync-docs.mjs',
    features,
    planos_nao_arquivados: inbox,
    specs_sem_registro: specsSemDoc,
    decisoes: decisions,
  },
  null,
  2,
)}\n`;

if (errors.length) {
  for (const e of errors) console.error(`[sync-docs] ${e}`);
}

if (checkOnly) {
  const stale = [
    [INDEX_MD, indexMd],
    [INDEX_JSON, indexJson],
  ].filter(([path, content]) => !existsSync(path) || readFileSync(path, 'utf8') !== content);
  for (const [path] of stale) console.error(`[sync-docs] ${rel(path)} desatualizado — rode pnpm docs:sync.`);
  if (errors.length || stale.length) process.exit(1);
  console.log(`[sync-docs] ok — ${features.length} features, ${decisions.length} decisões.`);
  process.exit(0);
}

writeFileSync(INDEX_MD, indexMd);
writeFileSync(INDEX_JSON, indexJson);
console.log(
  `[sync-docs] ${features.length} features, ${decisions.length} decisões, ${inbox.length} plano(s) na caixa de entrada.`,
);
if (errors.length) process.exit(1);
