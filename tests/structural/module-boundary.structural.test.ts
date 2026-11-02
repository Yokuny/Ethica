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
  identity: ['Tenant', 'User', 'Session', 'Invite', 'Activity', 'transitionTenantStatus'],
  case: ['Case', 'Deadline', 'Party', 'CourtDivision', 'COURT_DIVISION_COLLATION'],
  agenda: ['Appointment', 'Inspection'],
  finance: ['Transaction'],
  prospecting: ['Opportunity'],
  documents: ['Report', 'Template'],
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
            "import { invalidDataError } from './errorHandler.middleware.js';\nexport const y = invalidDataError;\n",
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
});
