import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

// Extracted from module-boundary.structural.test.ts (AD-038) to be reused by
// any app organized in modules (today: api) — the
// import/AST scan has nothing app-specific, only the
// configuration (allowed cross-module suffixes, ownership table,
// pastas legadas, camada compartilhada) muda por chamador.

export type ImportRef = { specifier: string; valueNames: string[] };

// *.test.ts are left out: e2e tests mount a module of another domain in the setup.
export const findSourceFiles = (dir: string): string[] => {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findSourceFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
};

// Module = first folder under the root. Files at the root itself (e.g.
// schema.registry.ts) and paths outside it belong to no module.
export const moduleOf = (root: string, path: string): string | null => {
  const parts = relative(root, path).split(sep);
  return parts.length > 1 && parts[0] !== '..' ? parts[0] : null;
};

// Nomes importados/re-exportados como VALOR: `import type { X }` e
// `import { type X }` do not count (they disappear on compilation).
const valueNamesOf = (node: ts.ImportDeclaration | ts.ExportDeclaration): string[] => {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (!clause || clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return [];
    const names = clause.name ? ['default'] : [];
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        if (!element.isTypeOnly) names.push((element.propertyName ?? element.name).text);
      }
    }
    return names;
  }
  if (node.isTypeOnly || !node.exportClause || !ts.isNamedExports(node.exportClause)) return [];
  return node.exportClause.elements
    .filter((element) => !element.isTypeOnly)
    .map((element) => (element.propertyName ?? element.name).text);
};

export const readImports = (file: string): ImportRef[] => {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  const refs: ImportRef[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      refs.push({ specifier: node.moduleSpecifier.text, valueNames: valueNamesOf(node) });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      refs.push({ specifier: node.arguments[0].text, valueNames: [] });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return refs;
};

// Module→module edges by relative import: { file, from, to, specifier }.
export const crossModuleImports = (root: string) =>
  findSourceFiles(root).flatMap((file) => {
    const from = moduleOf(root, file);
    return readImports(file)
      .filter(({ specifier }) => specifier.startsWith('.'))
      .map(({ specifier }) => ({ file, from, to: moduleOf(root, resolve(dirname(file), specifier)), specifier }))
      .filter(({ from: source, to }) => to !== null && to !== source);
  });

// Cross-module import whose specifier does not end in one of the suffixes
// permitidos (ex.: `.service.js`/`.schema.js`).
export const findCrossModuleImportViolations = (root: string, allowedSuffixes: readonly string[]): string[] =>
  crossModuleImports(root)
    .filter(({ specifier }) => !allowedSuffixes.some((suffix) => specifier.endsWith(suffix)))
    .map(({ file, specifier }) => `${relative(root, file)} -> ${specifier}`);

// Each cycle as the path [a, b, …, a].
export const findModuleCycles = (root: string): string[][] => {
  const graph = new Map<string, Set<string>>();
  for (const { from, to } of crossModuleImports(root)) {
    if (from === null || to === null) continue;
    const targets = graph.get(from) ?? new Set<string>();
    targets.add(to);
    graph.set(from, targets);
  }

  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[][] = [];
  const visit = (node: string, path: string[]): void => {
    state.set(node, 'visiting');
    for (const next of [...(graph.get(node) ?? [])].sort()) {
      const nextState = state.get(next);
      if (nextState === 'visiting') cycles.push([...path.slice(path.indexOf(next)), next]);
      else if (nextState === undefined) visit(next, [...path, next]);
    }
    state.set(node, 'done');
  };
  for (const node of [...graph.keys()].sort()) {
    if (!state.has(node)) visit(node, [node]);
  }
  return cycles;
};

// Legacy layer folder/file that still exists at the app root.
export const findLegacyLayerViolations = (root: string, legacyPaths: readonly string[]): string[] =>
  legacyPaths.filter((relPath) => existsSync(join(root, relPath)));

// The shared layer (e.g. config/middlewares/…) importing from
// modules/, outside the exempt prefixes (e.g. events/subscribers/**).
export const findSharedLayerModuleImportViolations = (
  root: string,
  sharedDirs: readonly string[],
  exemptPrefixes: readonly string[] = [],
): string[] => {
  const violations: string[] = [];
  for (const dir of sharedDirs) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    for (const file of findSourceFiles(dirPath)) {
      const relFile = relative(root, file);
      if (exemptPrefixes.some((prefix) => relFile.startsWith(prefix))) continue;
      for (const { specifier } of readImports(file)) {
        if (!specifier.startsWith('.')) continue;
        const relResolved = relative(root, resolve(dirname(file), specifier));
        if (relResolved === 'modules' || relResolved.startsWith(`modules${sep}`)) {
          violations.push(`${relFile} -> ${specifier}`);
        }
      }
    }
  }
  return violations;
};

export const withFixture = (files: Record<string, string>, run: (root: string) => void): void => {
  const root = mkdtempSync(join(tmpdir(), 'module-boundary-'));
  try {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};
