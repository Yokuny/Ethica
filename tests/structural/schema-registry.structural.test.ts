import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { schemaRegistry, TENANT_FORBIDDEN_KEYS } from '@ethica/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { type ZodType, z } from 'zod';
import { apiSchemaRegistry } from '../../apps/api/src/modules/schema.registry.js';

// AD-010: the most important guardrail of the project gives a false green if a new
// schema is not registered. This file scans the filesystem instead of
// trusting only the declared registry (design.md, Risk "registry rots
// silently").
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

// MOD-09: a schema is "registered" if it is in @ethica/contracts OR in the app
// registry (apps/api/src/modules/schema.registry.ts).
const registeredSchemas = (...registries: SchemaRegistry[]): ReadonlySet<ZodType> =>
  new Set(registries.flatMap((registry) => registry.map((entry) => entry.schema)));

// Returns "file:exportName" for every ZodType export, under `roots`, that
// is not (by object reference, not by name) in `registered`.
const findUnregisteredSchemaExports = async (roots: string[], registered: ReadonlySet<ZodType>): Promise<string[]> => {
  const unregistered: string[] = [];

  for (const root of roots) {
    let files: string[];
    try {
      files = findSchemaFiles(root);
    } catch {
      continue; // root may not exist (e.g. fixture already removed)
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

describe('schema registry completeness (AD-010)', () => {
  describe('self-check', () => {
    const fixtureDir = join(REPO_ROOT, 'tests', 'structural', '__fixture__');
    const fixtureFile = join(fixtureDir, 'unregistered.schema.ts');

    afterEach(() => {
      rmSync(fixtureDir, { recursive: true, force: true });
    });

    it('the sweep itself flags a Zod export that exists on disk but was never added to schemaRegistry', async () => {
      mkdirSync(fixtureDir, { recursive: true });
      writeFileSync(
        fixtureFile,
        "import { z } from 'zod';\nexport const unregisteredFixtureSchema = z.object({ foo: z.string() });\n",
      );

      const unregistered = await findUnregisteredSchemaExports(
        [fixtureDir],
        registeredSchemas(schemaRegistry, apiSchemaRegistry),
      );

      expect(unregistered).toEqual(['tests/structural/__fixture__/unregistered.schema.ts:unregisteredFixtureSchema']);
    });

    it('the sweep does not flag a Zod export registered only in the app registry (MOD-09)', async () => {
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

  it('has every ZodType export from every *.schema.ts under packages/ and apps/ registered in schemaRegistry', async () => {
    const unregistered = await findUnregisteredSchemaExports(
      [join(REPO_ROOT, 'packages'), join(REPO_ROOT, 'apps')],
      registeredSchemas(schemaRegistry, apiSchemaRegistry),
    );

    expect(unregistered).toEqual([]);
  });

  it('rejects every TENANT_FORBIDDEN_KEYS field name inside every registered object schema', () => {
    expect(schemaRegistry.length).toBeGreaterThan(0);

    for (const { name, schema } of [...schemaRegistry, ...apiSchemaRegistry]) {
      if (!(schema instanceof z.ZodObject)) continue;
      const keys = Object.keys(schema.shape).map((key) => key.toLowerCase());
      for (const forbidden of TENANT_FORBIDDEN_KEYS) {
        expect(keys, `${name} não deve aceitar a chave "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });
});
