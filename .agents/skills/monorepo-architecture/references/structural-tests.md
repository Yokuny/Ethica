# Testes estruturais: as fronteiras travadas

Quatro arquivos em `tests/structural/`, rodados pelo project `structural` do Vitest. Eles leem o código-fonte (não executam o sistema) e falham quando uma fronteira da arquitetura é cruzada. Cada regra tem um **self-check** com arquivo sintético, para o teste não ficar verde por não enxergar nada.

Copie os quatro. O que muda por projeto está no topo de cada arquivo: o escopo `@scope/*` e a tabela de donos dos models. Dependência extra na raiz: `typescript` (a lib lê os imports pela AST).

| Arquivo | Trava |
| --- | --- |
| `lib/module-scan.ts` | leitura de imports e do grafo entre módulos; sem regra própria |
| `module-boundary.structural.test.ts` | (a) import entre módulos só de `.service.js` e `.schema.js`; (b) model só no módulo dono; (c) grafo sem ciclo; (d) nenhuma pasta por camada técnica; (e) camada compartilhada não importa `modules/` |
| `db-boundary.structural.test.ts` | `mongoose` só em `packages/db` |
| `schema-registry.structural.test.ts` | todo schema Zod exportado de um `*.schema.ts` está num registry; nenhum schema registrado aceita chave de tenant |

Ao criar um model, acrescente-o à tabela `DB_OWNERSHIP`. Ao criar um schema, acrescente-o ao registry do pacote ou do app. Um teste vermelho aqui nunca se resolve afrouxando a regra.

## `tests/structural/lib/module-scan.ts`

```ts
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

// Generic import scan for any app organized in modules. Nothing here is app-specific: the
// configuration (allowed suffixes, ownership table, legacy folders, shared layer) comes from the caller.

export type ImportRef = { specifier: string; valueNames: string[] };

// *.test.ts are left out: an e2e test may mount a module of another domain in its setup.
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

// Module = first folder under the root. Files at the root itself belong to no module.
export const moduleOf = (root: string, path: string): string | null => {
  const parts = relative(root, path).split(sep);
  return parts.length > 1 && parts[0] !== '..' ? parts[0] : null;
};

// Names imported or re-exported as a VALUE: `import type { X }` and `import { type X }` do not count.
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

// Cross-module import whose specifier does not end in one of the allowed suffixes.
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

// Technical-layer folder that still exists at the app root.
export const findLegacyLayerViolations = (root: string, legacyPaths: readonly string[]): string[] =>
  legacyPaths.filter((relPath) => existsSync(join(root, relPath)));

// The shared layer importing from modules/, outside the exempt prefixes.
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
```

## `tests/structural/module-boundary.structural.test.ts`

```ts
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findCrossModuleImportViolations,
  findLegacyLayerViolations,
  findModuleCycles,
  findSharedLayerModuleImportViolations,
  findSourceFiles,
  moduleOf,
  readImports,
  withFixture,
} from './lib/module-scan.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const API_SRC_ROOT = join(REPO_ROOT, 'apps', 'api', 'src');
const MODULES_ROOT = join(API_SRC_ROOT, 'modules');
const DB_PACKAGE = '@scope/db';

// Values of the db package that only the owning module may import (models and business transitions).
// Helpers without an owner (tenantScoped, dates, types) stay out and can be imported by any module.
const DB_OWNERSHIP: Record<string, readonly string[]> = {
  identity: ['Tenant', 'User', 'Session'],
};

// From another module only the service layer (and the schema one, for types) is consumed.
const CROSS_MODULE_ALLOWED_SUFFIXES = ['.service.js', '.schema.js'];

// All domain code lives in modules/<module>/: no technical-layer folder at the app root.
const LEGACY_LAYER_PATHS = ['routers', 'controllers', 'services', 'repositories'];

// The shared layer does not import from modules/. Exceptions: app.ts/server.ts (they sit directly in src/,
// outside these folders) and events/subscribers/** (a subscriber calls the service of the consuming module).
const SHARED_LAYER_DIRS = ['config', 'middlewares', 'providers', 'metrics', 'events'];
const EVENT_SUBSCRIBERS_PREFIX = join('events', 'subscribers') + sep;

const findDbOwnershipViolations = (root: string, ownership: Record<string, readonly string[]>): string[] => {
  const ownerByName = new Map(
    Object.entries(ownership).flatMap(([owner, names]) => names.map((name) => [name, owner] as const)),
  );
  const violations: string[] = [];
  for (const file of findSourceFiles(root)) {
    const from = moduleOf(root, file);
    for (const { specifier, valueNames } of readImports(file)) {
      if (specifier !== DB_PACKAGE) continue;
      for (const name of valueNames) {
        const owner = ownerByName.get(name);
        if (owner && owner !== from) violations.push(`${relative(root, file)}: ${name} (owner: ${owner})`);
      }
    }
  }
  return violations;
};

describe('api module boundaries', () => {
  describe('self-check', () => {
    it('(a) flags a cross-module import that is not .service.js/.schema.js; same-module imports and tests are exempt', () => {
      withFixture(
        {
          'a/x.service.ts': "import { y } from '../b/y.repository.js';\nexport const x = y;\n",
          'a/ok.service.ts': [
            "import { y } from '../b/y.service.js';",
            "import type { Y } from '../b/y.schema.js';",
            "import { own } from './own.repository.js';",
            'export const ok: Y = y ?? own;',
          ].join('\n'),
          'a/x.router.e2e.test.ts': "import { y } from '../b/y.repository.js';\nexport const t = y;\n",
        },
        (root) => {
          expect(findCrossModuleImportViolations(root, CROSS_MODULE_ALLOWED_SUFFIXES)).toEqual([
            'a/x.service.ts -> ../b/y.repository.js',
          ]);
        },
      );
    });

    it('(b) flags a value import of a db name owned by another module, but not type-only imports nor the owner', () => {
      withFixture(
        {
          'a/x.repository.ts': `import { Thing } from '${DB_PACKAGE}';\nexport const x = Thing;\n`,
          'a/types.repository.ts': [
            `import type { ThingDocument } from '${DB_PACKAGE}';`,
            `import { type Thing, tenantScoped } from '${DB_PACKAGE}';`,
            'export type T = ThingDocument | typeof Thing | typeof tenantScoped;',
          ].join('\n'),
          'b/thing.repository.ts': `import { Thing } from '${DB_PACKAGE}';\nexport const t = Thing;\n`,
        },
        (root) => {
          expect(findDbOwnershipViolations(root, { b: ['Thing'] })).toEqual(['a/x.repository.ts: Thing (owner: b)']);
        },
      );
    });

    it('(c) reports a dependency cycle a -> b -> a, and nothing for a one-way a -> b', () => {
      withFixture(
        {
          'a/a.service.ts': "import { b } from '../b/b.service.js';\nexport const a = b;\n",
          'b/b.service.ts': "import { a } from '../a/a.service.js';\nexport const b = a;\n",
        },
        (root) => {
          expect(findModuleCycles(root)).toEqual([['a', 'b', 'a']]);
        },
      );
      withFixture({ 'a/a.service.ts': "import { b } from '../b/b.service.js';\nexport const a = b;\n" }, (root) => {
        expect(findModuleCycles(root)).toEqual([]);
      });
    });

    it('(d) flags a technical-layer folder that still exists, and nothing for a clean tree', () => {
      withFixture({ 'routers/x.router.ts': 'export const x = 1;\n' }, (root) => {
        expect(findLegacyLayerViolations(root, LEGACY_LAYER_PATHS)).toEqual(['routers']);
      });
      withFixture({ 'modules/a/x.service.ts': 'export const x = 1;\n' }, (root) => {
        expect(findLegacyLayerViolations(root, LEGACY_LAYER_PATHS)).toEqual([]);
      });
    });

    it('(e) flags the shared layer importing from modules/, exempts events/subscribers/** and same-layer imports', () => {
      withFixture(
        {
          'middlewares/authentication.middleware.ts':
            "import { authService } from '../modules/identity/auth.service.js';\nexport const x = authService;\n",
          'middlewares/validation.middleware.ts':
            "import { invalidDataError } from './errorHandler.middleware.js';\nexport const y = invalidDataError;\n",
          'events/subscribers/a.subscriber.ts':
            "import { onEvent } from '../../modules/a/a.service.js';\nexport const z = onEvent;\n",
        },
        (root) => {
          expect(findSharedLayerModuleImportViolations(root, SHARED_LAYER_DIRS, [EVENT_SUBSCRIBERS_PREFIX])).toEqual([
            'middlewares/authentication.middleware.ts -> ../modules/identity/auth.service.js',
          ]);
        },
      );
    });
  });

  it('(a) every cross-module import under modules/ targets a .service.js or .schema.js file', () => {
    expect(findCrossModuleImportViolations(MODULES_ROOT, CROSS_MODULE_ALLOWED_SUFFIXES)).toEqual([]);
  });

  it('(b) every owned db value is imported only by its owning module', () => {
    expect(findDbOwnershipViolations(MODULES_ROOT, DB_OWNERSHIP)).toEqual([]);
  });

  it('(c) the module dependency graph is acyclic', () => {
    expect(findModuleCycles(MODULES_ROOT)).toEqual([]);
  });

  it('(d) no technical-layer folder exists under apps/api/src', () => {
    expect(findLegacyLayerViolations(API_SRC_ROOT, LEGACY_LAYER_PATHS)).toEqual([]);
  });

  it('(e) the shared layer never imports from modules/, except events/subscribers/**', () => {
    expect(findSharedLayerModuleImportViolations(API_SRC_ROOT, SHARED_LAYER_DIRS, [EVENT_SUBSCRIBERS_PREFIX])).toEqual(
      [],
    );
  });
});
```

## `tests/structural/db-boundary.structural.test.ts`

```ts
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Only packages/db may import the database library. This test scans apps/** for it.
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const APPS_ROOT = join(REPO_ROOT, 'apps');
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const DB_LIBRARY_IMPORT_PATTERN = /from\s+['"]mongoose['"]|require\(\s*['"]mongoose['"]\s*\)/;

const findSourceFiles = (dir: string): string[] => {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findSourceFiles(full));
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
};

const findDbLibraryImportOffenders = (root: string): string[] =>
  findSourceFiles(root)
    .filter((file) => DB_LIBRARY_IMPORT_PATTERN.test(readFileSync(file, 'utf8')))
    .map((file) => relative(REPO_ROOT, file));

describe('database library import boundary', () => {
  it('self-check: the scan catches a synthetic offender under apps/**', () => {
    const fixtureDir = join(APPS_ROOT, '__fixture__');
    const fixtureFile = join(fixtureDir, 'offender.ts');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(fixtureFile, "import mongoose from 'mongoose';\nexport const x = mongoose;\n");

    try {
      expect(findDbLibraryImportOffenders(APPS_ROOT)).toContain(relative(REPO_ROOT, fixtureFile));
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('finds no import of the database library anywhere under apps/**', () => {
    expect(findDbLibraryImportOffenders(APPS_ROOT)).toEqual([]);
  });
});
```

## `tests/structural/schema-registry.structural.test.ts`

```ts
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { schemaRegistry, TENANT_FORBIDDEN_KEYS } from '@scope/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { type ZodType, z } from 'zod';
import { apiSchemaRegistry } from '../../apps/api/src/modules/schema.registry.js';

// A registry that depends on someone remembering to register gives a false green. This file scans the
// filesystem for every exported Zod schema instead of trusting only what was declared.
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist']);

const findSchemaFiles = (dir: string): string[] => {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findSchemaFiles(full));
    } else if (entry.endsWith('.schema.ts')) {
      results.push(full);
    }
  }
  return results;
};

type SchemaRegistry = ReadonlyArray<{ name: string; schema: ZodType }>;

// A schema is "registered" if it is in the contracts registry OR in an app registry.
const registeredSchemas = (...registries: SchemaRegistry[]): ReadonlySet<ZodType> =>
  new Set(registries.flatMap((registry) => registry.map((entry) => entry.schema)));

// Returns "file:exportName" for every ZodType export under `roots` that is not (by object reference,
// not by name) in `registered`.
const findUnregisteredSchemaExports = async (roots: string[], registered: ReadonlySet<ZodType>): Promise<string[]> => {
  const unregistered: string[] = [];

  for (const root of roots) {
    let files: string[];
    try {
      files = findSchemaFiles(root);
    } catch {
      continue; // root may not exist
    }

    for (const file of files) {
      const mod: Record<string, unknown> = await import(pathToFileURL(file).href);
      for (const [exportName, value] of Object.entries(mod)) {
        if (value instanceof z.ZodType && !registered.has(value)) {
          unregistered.push(`${relative(REPO_ROOT, file)}:${exportName}`);
        }
      }
    }
  }

  return unregistered;
};

describe('schema registry completeness', () => {
  describe('self-check', () => {
    const fixtureDir = join(REPO_ROOT, 'tests', 'structural', '__fixture__');

    afterEach(() => {
      rmSync(fixtureDir, { recursive: true, force: true });
    });

    it('flags a Zod export that exists on disk but was never registered', async () => {
      mkdirSync(fixtureDir, { recursive: true });
      writeFileSync(
        join(fixtureDir, 'unregistered.schema.ts'),
        "import { z } from 'zod';\nexport const unregisteredFixtureSchema = z.object({ foo: z.string() });\n",
      );

      const unregistered = await findUnregisteredSchemaExports(
        [fixtureDir],
        registeredSchemas(schemaRegistry, apiSchemaRegistry),
      );

      expect(unregistered).toEqual(['tests/structural/__fixture__/unregistered.schema.ts:unregisteredFixtureSchema']);
    });

    it('does not flag a Zod export registered only in the app registry', async () => {
      const appFixtureFile = join(fixtureDir, 'appRegistered.schema.ts');
      mkdirSync(fixtureDir, { recursive: true });
      writeFileSync(
        appFixtureFile,
        "import { z } from 'zod';\nexport const appRegisteredFixtureSchema = z.object({ foo: z.string() });\n",
      );
      const { appRegisteredFixtureSchema } = await import(pathToFileURL(appFixtureFile).href);
      const appRegistry: SchemaRegistry = [
        ...apiSchemaRegistry,
        { name: 'appRegisteredFixtureSchema', schema: appRegisteredFixtureSchema },
      ];

      expect(await findUnregisteredSchemaExports([fixtureDir], registeredSchemas(schemaRegistry))).toEqual([
        'tests/structural/__fixture__/appRegistered.schema.ts:appRegisteredFixtureSchema',
      ]);
      expect(await findUnregisteredSchemaExports([fixtureDir], registeredSchemas(schemaRegistry, appRegistry))).toEqual(
        [],
      );
    });
  });

  it('has every ZodType export from every *.schema.ts under packages/ and apps/ in a registry', async () => {
    const unregistered = await findUnregisteredSchemaExports(
      [join(REPO_ROOT, 'packages'), join(REPO_ROOT, 'apps')],
      registeredSchemas(schemaRegistry, apiSchemaRegistry),
    );

    expect(unregistered).toEqual([]);
  });

  it('rejects every tenant key inside every registered object schema', () => {
    expect(schemaRegistry.length).toBeGreaterThan(0);

    for (const { name, schema } of [...schemaRegistry, ...apiSchemaRegistry]) {
      if (!(schema instanceof z.ZodObject)) continue;
      const keys = Object.keys(schema.shape).map((key) => key.toLowerCase());
      for (const forbidden of TENANT_FORBIDDEN_KEYS) {
        expect(keys, `${name} must not accept the key "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });
});
```
