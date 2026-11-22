import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSourceFiles, readImports, withFixture } from './lib/module-scan.js';

// AD-267: the worker and the api are separate services that talk only through the database. Neither
// imports the other, and the worker writes `Notification` in one file only (D7): it inserts notices
// and suggestions and never edits what the BFF owns.
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const WORKER_SRC = join(REPO_ROOT, 'apps', 'worker', 'src');
const API_SRC = join(REPO_ROOT, 'apps', 'api', 'src');
const NOTIFICATION_WRITES = join('queue', 'notification-writes.ts');
// Models the api cannot import: the worker owns them.
const WORKER_MODELS = ['WorkerJob', 'WorkerHeartbeat', 'NotificationDelivery'];

const importsOtherApp = (root: string, other: 'api' | 'worker'): string[] =>
  findSourceFiles(root).flatMap((file) =>
    readImports(file)
      .filter(({ specifier }) => specifier.includes(`/${other}/src/`) || specifier === other)
      .map(({ specifier }) => `${relative(root, file)}: ${specifier}`),
  );

const notificationWritersOutsideTheFile = (root: string): string[] =>
  findSourceFiles(root)
    .filter((file) => relative(root, file) !== NOTIFICATION_WRITES)
    .filter((file) =>
      readImports(file).some(
        ({ specifier, valueNames }) => specifier === '@ethica/db' && valueNames.includes('Notification'),
      ),
    )
    .map((file) => relative(root, file).split(sep).join('/'));

const apiImportsOfWorkerModels = (root: string): string[] =>
  findSourceFiles(root).flatMap((file) =>
    readImports(file)
      .filter(({ specifier }) => specifier === '@ethica/db')
      .flatMap(({ valueNames }) => valueNames.filter((name) => WORKER_MODELS.includes(name)))
      .map((name) => `${relative(root, file)}: ${name}`),
  );

describe('fronteira do worker (AD-267)', () => {
  it('self-check: pega o import entre apps e o Notification fora do arquivo de escrita', () => {
    withFixture(
      {
        'jobs/a.ts': "import { Notification } from '@ethica/db';\nimport { x } from '../../../api/src/app.js';\n",
        'queue/notification-writes.ts': "import { Notification } from '@ethica/db';\n",
      },
      (root) => {
        expect(importsOtherApp(root, 'api')).toEqual(['jobs/a.ts: ../../../api/src/app.js']);
        expect(notificationWritersOutsideTheFile(root)).toEqual(['jobs/a.ts']);
      },
    );
  });

  it('o worker não importa o api, e o api não importa o worker', () => {
    expect(importsOtherApp(WORKER_SRC, 'api')).toEqual([]);
    expect(importsOtherApp(API_SRC, 'worker')).toEqual([]);
  });

  it('só queue/notification-writes.ts do worker usa o model Notification', () => {
    expect(notificationWritersOutsideTheFile(WORKER_SRC)).toEqual([]);
  });

  it('o api não usa os models do worker', () => {
    expect(apiImportsOfWorkerModels(API_SRC)).toEqual([]);
  });
});
