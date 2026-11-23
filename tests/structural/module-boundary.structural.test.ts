import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
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

// AD-038: boundaries between the apps/api/src/modules modules. Same
// mold as mongoose-boundary.structural.test.ts (filesystem scan +
// self-check with a fixture), but each rule takes the root as a parameter so
// the fixtures live in a temporary directory. The import/AST
// scan itself is generic (lib/module-scan.ts).
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const API_SRC_ROOT = join(REPO_ROOT, 'apps', 'api', 'src');
const MODULES_ROOT = join(API_SRC_ROOT, 'modules');

// design.md, "Ownership (MOD-05)": @ethica/db values that only the owning module
// imports. Helpers without an owner (tenantScoped, hashToken, crypto, dates, types)
// stay out of the table and can be imported by any module.
const DB_OWNERSHIP: Record<string, readonly string[]> = {
  identity: [
    'Tenant',
    'User',
    'Session',
    'Passkey',
    'Invite',
    'AccessKey',
    'Activity',
    'PushSubscription',
    'transitionTenantStatus',
  ],
  case: ['Case', 'Party', 'CourtDivision', 'COURT_DIVISION_COLLATION', 'ServiceOrderSequence', 'RetiredServiceOrder'],
  agenda: ['Appointment', 'Inspection', 'CalendarEntry'],
  finance: ['Transaction'],
  documents: ['Report', 'Template', 'Signatory'],
  notifications: ['Notification'],
  // Read only: the worker writes them (AD-271).
  automation: ['CourtProcess', 'CaseCourtSync'],
};
const DB_OWNER_BY_NAME = new Map(
  Object.entries(DB_OWNERSHIP).flatMap(([owner, names]) => names.map((name) => [name, owner] as const)),
);

// MOD-04: from another module only the service layer (and the schema one) is consumed.
const CROSS_MODULE_ALLOWED_SUFFIXES = ['.service.js', '.schema.js'];

// Rule (b) — MOD-05. Specific to the api (the ownership table above only
// makes sense here), so it did not go to the generic lib/module-scan.ts.
const findDbOwnershipViolations = (root: string): string[] => {
  const violations: string[] = [];
  for (const file of findSourceFiles(root)) {
    const from = moduleOf(root, file);
    for (const { specifier, valueNames } of readImports(file)) {
      if (specifier !== '@ethica/db') continue;
      for (const name of valueNames) {
        const owner = DB_OWNER_BY_NAME.get(name);
        if (owner && owner !== from) violations.push(`${relative(root, file)}: ${name} (dono: ${owner})`);
      }
    }
  }
  return violations;
};

// Rule (d) — MOD-01: from T22 on, no legacy layer folder (nor the
// old authDeps.ts) may exist — all domain code lives in
// modules/<m>/, and the field value store adapter of modules/ itself
// (T7/T11/T12) no longer lives in providers/fieldValueStore/.
const LEGACY_LAYER_PATHS = [
  'routers',
  'controllers',
  'services',
  'repositories',
  'workers',
  'ws',
  'authDeps.ts',
  join('providers', 'fieldValueStore'),
];

// Regra (e) — MOD-03: a camada compartilhada (config/ middlewares/
// providers/ metrics/ events/) does not import from modules/. Exceptions: `app.ts`/
// `server.ts` (composition root, directly in src/, outside those folders — never
// scanned here) and `events/subscribers/**` (only there may a subscriber
// import `<module>/*.service.js` to react to a domain event).
const SHARED_LAYER_DIRS = ['config', 'middlewares', 'providers', 'metrics', 'events'];
const EVENT_SUBSCRIBERS_PREFIX = join('events', 'subscribers') + sep;

// Rules (f)–(j) — AD-284: one shape per layer. The 409 of the offline inspection
// (AD-128) is the only controller try/catch and the only module error class.
const CONTROLLER_TRY_EXEMPT = ['agenda/inspection.controller.ts'];
const ERROR_CLASS_EXEMPT = ['InspectionConflictError'];
const LAYER_SUFFIXES = ['.router.ts', '.controller.ts', '.service.ts', '.repository.ts', '.schema.ts'];
const NOT_FROM_REPOSITORY = ['.service.js', '.controller.js', '.router.js', '.repository.js'];
const moduleFiles = (root: string) => findSourceFiles(root).filter((file) => moduleOf(root, file) !== null);

// (f) controller: no try/catch, no repository, no @ethica/db value.
const findControllerViolations = (root: string): string[] =>
  moduleFiles(root)
    .filter((file) => file.endsWith('.controller.ts'))
    .flatMap((file) => {
      const rel = relative(root, file).split(sep).join('/');
      const found: string[] = [];
      if (!CONTROLLER_TRY_EXEMPT.includes(rel) && /\btry\s*\{/.test(readFileSync(file, 'utf8')))
        found.push(`${rel}: try`);
      for (const { specifier, valueNames } of readImports(file)) {
        if (specifier.endsWith('.repository.js')) found.push(`${rel} -> ${specifier}`);
        if (specifier === '@ethica/db' && valueNames.length) found.push(`${rel} -> @ethica/db`);
      }
      return found;
    });

// (g) no module error class: "not found" is CustomError('…', 404) thrown by the service.
const findErrorClassViolations = (root: string): string[] =>
  moduleFiles(root).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/class (\w+) extends \w*Error\b/g)]
      .filter(([, name]) => !ERROR_CLASS_EXEMPT.includes(name as string))
      .map(([, name]) => `${relative(root, file)}: ${name}`),
  );

// (h) only the repository imports an owned model; it never imports another layer.
const findRepositoryLayerViolations = (root: string): string[] =>
  moduleFiles(root).flatMap((file) => {
    const rel = relative(root, file);
    const isRepository = file.endsWith('.repository.ts');
    return readImports(file).flatMap(({ specifier, valueNames }) => {
      if (!isRepository && specifier === '@ethica/db') {
        return valueNames.filter((name) => DB_OWNER_BY_NAME.has(name)).map((name) => `${rel}: ${name}`);
      }
      if (isRepository && NOT_FROM_REPOSITORY.some((suffix) => specifier.endsWith(suffix)))
        return [`${rel} -> ${specifier}`];
      return [];
    });
  });

// (i) a module file is one of the five layers or a support file `<entity>.<role>.ts`.
const findFileShapeViolations = (root: string): string[] =>
  moduleFiles(root)
    .filter((file) => !LAYER_SUFFIXES.some((suffix) => file.endsWith(suffix)))
    .filter((file) => !/^[a-z0-9-]+\.[a-z0-9-]+\.ts$/.test(basename(file)))
    .map((file) => relative(root, file));

// (j) every file name under apps/api/src is kebab-case (tests included).
const findFileNameViolations = (root: string): string[] =>
  readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !/^[a-z0-9.-]+$/.test(entry.name))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)));

describe('api module boundaries (AD-038)', () => {
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

    it('(b) flags a value import of an @ethica/db name owned by another module, but not type-only imports nor the owner', () => {
      withFixture(
        {
          'a/x.repository.ts': "import { Case } from '@ethica/db';\nexport const x = Case;\n",
          'a/types.repository.ts': [
            "import type { CaseDocument } from '@ethica/db';",
            "import { type Case, tenantScoped } from '@ethica/db';",
            'export type T = CaseDocument | typeof Case | typeof tenantScoped;',
          ].join('\n'),
          'case/case.repository.ts': "import { Case } from '@ethica/db';\nexport const c = Case;\n",
        },
        (root) => {
          expect(findDbOwnershipViolations(root)).toEqual(['a/x.repository.ts: Case (dono: case)']);
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

    it('(d) flags a legacy layer folder or authDeps.ts that still exists, and nothing for a clean tree', () => {
      withFixture({ 'routers/board.router.ts': 'export const x = 1;\n' }, (root) => {
        expect(findLegacyLayerViolations(root, LEGACY_LAYER_PATHS)).toEqual(['routers']);
      });
      withFixture({ 'authDeps.ts': 'export const x = 1;\n' }, (root) => {
        expect(findLegacyLayerViolations(root, LEGACY_LAYER_PATHS)).toEqual(['authDeps.ts']);
      });
      withFixture({ 'modules/kanban/board.service.ts': 'export const x = 1;\n' }, (root) => {
        expect(findLegacyLayerViolations(root, LEGACY_LAYER_PATHS)).toEqual([]);
      });
    });

    it('(e) flags the shared layer importing from modules/, exempts events/subscribers/** and same-layer imports', () => {
      withFixture(
        {
          'middlewares/authentication.middleware.ts':
            "import { authService } from '../modules/identity/auth.service.js';\nexport const x = authService;\n",
          'middlewares/validation.middleware.ts':
            "import { invalidDataError } from './error-handler.middleware.js';\nexport const y = invalidDataError;\n",
          'events/subscribers/fieldTemplate.subscriber.ts':
            "import { seed } from '../../modules/field-template/fieldTemplate.service.js';\nexport const z = seed;\n",
        },
        (root) => {
          expect(findSharedLayerModuleImportViolations(root, SHARED_LAYER_DIRS, [EVENT_SUBSCRIBERS_PREFIX])).toEqual([
            'middlewares/authentication.middleware.ts -> ../modules/identity/auth.service.js',
          ]);
        },
      );
    });

    it('(f) flags a controller with try/catch or importing a repository/model; the inspection 409 is exempt', () => {
      withFixture(
        {
          'a/x.controller.ts':
            "import { Case } from '@ethica/db';\nimport { y } from './x.repository.js';\nexport const x = async () => { try { y(Case); } catch {} };\n",
          'a/ok.controller.ts': "import * as s from './ok.service.js';\nexport const ok = async () => s.run();\n",
          'agenda/inspection.controller.ts': 'export const save = async () => { try { 1; } catch {} };\n',
        },
        (root) => {
          expect(findControllerViolations(root)).toEqual([
            'a/x.controller.ts: try',
            'a/x.controller.ts -> @ethica/db',
            'a/x.controller.ts -> ./x.repository.js',
          ]);
        },
      );
    });

    it('(g) flags a module error class other than InspectionConflictError', () => {
      withFixture(
        {
          'a/x.service.ts': 'export class XNotFoundError extends KeyedError {}\n',
          'agenda/inspection.service.ts': 'export class InspectionConflictError extends KeyedError {}\n',
        },
        (root) => {
          expect(findErrorClassViolations(root)).toEqual(['a/x.service.ts: XNotFoundError']);
        },
      );
    });

    it('(h) flags an owned model outside a repository and a repository importing another layer', () => {
      withFixture(
        {
          'case/case.deps.ts':
            "import { Case, dateInDisplayTz } from '@ethica/db';\nexport const d = [Case, dateInDisplayTz];\n",
          'case/case.repository.ts':
            "import { Case } from '@ethica/db';\nimport { p } from './party.repository.js';\nimport { a } from './case.avatar.js';\nexport const c = [Case, p, a];\n",
        },
        (root) => {
          expect(findRepositoryLayerViolations(root)).toEqual([
            'case/case.deps.ts: Case',
            'case/case.repository.ts -> ./party.repository.js',
          ]);
        },
      );
    });

    it('(i) flags a module file that is neither a layer nor <entity>.<role>.ts', () => {
      withFixture(
        {
          'a/helpers.ts': 'export const h = 1;\n',
          'a/x.y.z.ts': 'export const h = 1;\n',
          'a/report.docx.ts': 'export const h = 1;\n',
          'a/report.service.ts': 'export const h = 1;\n',
        },
        (root) => {
          expect(findFileShapeViolations(root).sort()).toEqual(['a/helpers.ts', 'a/x.y.z.ts']);
        },
      );
    });

    it('(j) flags a camelCase file name, tests included', () => {
      withFixture(
        { 'a/activityLog.service.ts': 'export const h = 1;\n', 'a/activity-log.router.e2e.test.ts': 'export {};\n' },
        (root) => {
          expect(findFileNameViolations(root)).toEqual(['a/activityLog.service.ts']);
        },
      );
    });
  });

  it('(a) every cross-module import under modules/ targets a .service.js or .schema.js file (MOD-04)', () => {
    expect(findCrossModuleImportViolations(MODULES_ROOT, CROSS_MODULE_ALLOWED_SUFFIXES)).toEqual([]);
  });

  it('(b) every owned @ethica/db value is imported only by its owning module (MOD-05)', () => {
    expect(findDbOwnershipViolations(MODULES_ROOT)).toEqual([]);
  });

  it('(c) the module dependency graph is acyclic (MOD-06)', () => {
    expect(findModuleCycles(MODULES_ROOT)).toEqual([]);
  });

  it('(d) no legacy layer folder or authDeps.ts exists under apps/api/src (MOD-01)', () => {
    expect(findLegacyLayerViolations(API_SRC_ROOT, LEGACY_LAYER_PATHS)).toEqual([]);
  });

  it('(e) the shared layer (config/middlewares/providers/metrics/events) never imports from modules/, except events/subscribers/** (MOD-03)', () => {
    expect(findSharedLayerModuleImportViolations(API_SRC_ROOT, SHARED_LAYER_DIRS, [EVENT_SUBSCRIBERS_PREFIX])).toEqual(
      [],
    );
  });

  it('(f) controllers have no try/catch (except the inspection 409) and never touch a repository or model (AD-284)', () => {
    expect(findControllerViolations(MODULES_ROOT)).toEqual([]);
  });

  it('(g) no module declares its own error class except InspectionConflictError (AD-284)', () => {
    expect(findErrorClassViolations(MODULES_ROOT)).toEqual([]);
  });

  it('(h) only repositories import owned models, and repositories import no other layer (AD-284)', () => {
    expect(findRepositoryLayerViolations(MODULES_ROOT)).toEqual([]);
  });

  it('(i) every module file is a layer file or a support file <entity>.<role>.ts (AD-284)', () => {
    expect(findFileShapeViolations(MODULES_ROOT)).toEqual([]);
  });

  it('(j) every file under apps/api/src is kebab-case (AD-284)', () => {
    expect(findFileNameViolations(API_SRC_ROOT)).toEqual([]);
  });
});
