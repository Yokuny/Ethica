# Monorepo: raiz, pacotes e workspaces novos

pnpm workspaces: `apps/*` roda, `packages/*` é compartilhado. Um install, um lockfile, um gate.

## Arquivos da raiz

`pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"

# Fixa uma versão única no repo quando dois workspaces resolveriam versões diferentes da mesma dependência.
overrides:
  vite: <versão usada em apps/web>
```

`package.json`

```json
{
  "name": "<projeto>",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@<versão>",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev:api": "pnpm --filter api run dev",
    "dev:web": "pnpm --filter web run dev",
    "check": "pnpm -r exec tsc --noEmit && pnpm biome check . && pnpm vitest run",
    "format": "biome check . --write"
  },
  "devDependencies": {
    "@biomejs/biome": "<versão>",
    "@scope/contracts": "workspace:*",
    "@scope/db": "workspace:*",
    "tsx": "<versão>",
    "typescript": "<versão>",
    "vitest": "<versão>",
    "zod": "<versão>"
  }
}
```

A raiz só tem ferramenta do repo. `@scope/contracts`, `@scope/db` e `zod` estão ali porque os testes de `tests/structural/` os importam.

`tsconfig.base.json` — cada workspace estende e só acrescenta `include` (os de React também `jsx`, `lib` de DOM e o alias `@`):

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

`biome.json` — substitui ESLint e Prettier no repo todo:

```json
{
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 120 },
  "linter": {
    "enabled": true,
    "rules": { "preset": "recommended", "correctness": { "noUnusedImports": { "level": "warn", "fix": "safe" } } }
  },
  "overrides": [
    {
      "includes": ["**/*.gen.ts"],
      "linter": { "enabled": false },
      "formatter": { "enabled": false },
      "assist": { "enabled": false }
    }
  ],
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } },
  "css": { "parser": { "tailwindDirectives": true } },
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } }
}
```

`vitest.config.ts` — quatro `projects` por sufixo de arquivo:

```ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// apps/api validates its env on module import (fail-fast). The Vitest process does not load the real
// .env, so every project that imports API code needs these values.
const apiBaseEnv = {
  NODE_ENV: 'test',
  API_PORT: '18080',
  SESSION_JWT_SECRET: 'test-secret',
  CORS_ORIGIN: 'http://localhost:15173',
};

// unit/structural never connect: the URI only needs to pass the env parse.
const apiTestEnv = { ...apiBaseEnv, MONGODB_URI: 'mongodb://localhost:37017/<projeto>_test?directConnection=true' };

// The root config does not inherit apps/web/vite.config.ts, so the web alias is repeated here.
const webAlias = { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) };

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        resolve: { alias: webAlias },
        test: {
          name: 'unit',
          include: ['packages/**/*.unit.test.ts', 'apps/*/src/**/*.unit.test.ts', 'apps/*/src/**/*.unit.test.tsx'],
          env: apiTestEnv,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['packages/db/src/**/*.int.test.ts', 'apps/api/src/**/*.int.test.ts'],
          globalSetup: ['packages/db/tests/setup/globalSetup.ts'],
          env: apiBaseEnv, // no MONGODB_URI on purpose: globalSetup injects the test database one
          // integration and e2e share ONE test database: files never run in parallel,
          // and the two projects run one after the other.
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['apps/*/src/**/*.e2e.test.ts'],
          globalSetup: ['packages/db/tests/setup/globalSetup.ts'],
          env: apiBaseEnv,
          fileParallelism: false,
          sequence: { groupOrder: 2 },
        },
      },
      {
        resolve: { alias: webAlias },
        test: { name: 'structural', include: ['tests/structural/*.structural.test.ts'], env: apiTestEnv },
      },
    ],
  },
});
```

`.env.example` — todas as variáveis de todos os apps; o `.env` real nunca é commitado:

```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:37017/<projeto>?directConnection=true

# api
API_PORT=18080
SESSION_JWT_SECRET=change-me-in-production
CORS_ORIGIN=http://localhost:15173

# web (o Vite só expõe ao navegador o que tem prefixo VITE_)
VITE_API_URL=http://localhost:18080
```

Convenções que valem para todo workspace:

- `"type": "module"`, `"private": true`. Dependência entre workspaces por `"workspace:*"`.
- Sem etapa de build em pacote: `"exports"` aponta para o `.ts`. Quem consome compila (Vite) ou executa direto (`tsx`). Por isso a API roda com `tsx` também em produção.
- Portas fora do padrão, para não colidir com outro projeto na mesma máquina: web `15173`, API `18080`, banco `37017`.
- Variável lida no servidor é validada no import por `apps/api/src/config/env.config.ts`; variável lida no navegador tem prefixo `VITE_`.

## Manifests

```json
// packages/contracts/package.json
{
  "name": "@scope/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "dependencies": { "zod": "<versão>" }
}
```

```json
// packages/db/package.json
{
  "name": "@scope/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "dependencies": { "@scope/contracts": "workspace:*", "mongoose": "<versão>" }
}
```

```json
// packages/ui/package.json — exporta por arquivo, para o app carregar só o que usa
{
  "name": "@scope/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.ts",
    "./lib/*": "./src/lib/*.ts"
  },
  "peerDependencies": { "react": "^19", "react-dom": "^19" }
}
```

```json
// apps/api/package.json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "tsx watch --env-file-if-exists=../../.env src/server.ts" },
  "dependencies": { "@scope/contracts": "workspace:*", "@scope/db": "workspace:*", "express": "<versão>", "zod": "<versão>" }
}
```

```json
// apps/web/package.json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build --logLevel error" },
  "dependencies": { "@scope/contracts": "workspace:*", "@scope/ui": "workspace:*" }
}
```

```json
// tsconfig.json de pacote ou da API
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

```json
// tsconfig.json do web (o de packages/ui é igual, sem baseUrl e paths)
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

## Os três pacotes

| Pacote | Entra | Nunca entra |
| --- | --- | --- |
| `packages/contracts` | schemas Zod de payload, enums como `as const` com o tipo derivado, tipos `z.infer`, envelope da resposta, chaves de mensagem, regra pura usada pelos dois lados, registry dos schemas | I/O, API só de Node ou só de navegador, React, Mongoose. Única dependência: `zod` |
| `packages/db` | um `<entidade>.model.ts` por model, conexão, `tenantScoped`, ajuda de consulta e de banco de teste, `syncIndexes()` | HTTP, regra de negócio de um módulo |
| `packages/ui` | primitivos visuais com tokens semânticos vindos do tema do app | CSS de marca, roteador, sessão, chamada à API, status de domínio |

### `packages/contracts`

```ts
// src/response/messages.ts — every API `message` is one of these keys, never ready-made text.
// Flat snake_case, names the text (never the screen); reuse a generic key before adding one.
export const API_MESSAGE_KEYS = [
  'not_found',
  'already_exists',
  'invalid_data',
  'internal_error',
  'invalid_session',
  'no_permission',
  'company_link_required',
  'created_successfully',
  'removed_successfully',
] as const;

export type ApiMessageKey = (typeof API_MESSAGE_KEYS)[number];

const apiMessageKeySet: ReadonlySet<string> = new Set(API_MESSAGE_KEYS);

export const isApiMessageKey = (value: unknown): value is ApiMessageKey =>
  typeof value === 'string' && apiMessageKeySet.has(value);
```

```ts
// src/response/index.ts — the single envelope of every API response
import type { ApiMessageKey } from './messages.js';

export * from './messages.js';

export type ApiResponse<T = undefined> = { success: boolean; data?: T; message?: string };

export const respObj = <T>(params: { data?: T; message?: ApiMessageKey }): ApiResponse<T> => ({
  success: true,
  data: params.data,
  message: params.message ?? '',
});

export const badRespObj = (params: { message: ApiMessageKey }): ApiResponse<never> => ({
  success: false,
  message: params.message,
});
```

```ts
// src/types.ts — what the API knows about whoever is calling, resolved from the session
export type Role = 'admin' | 'member';

export type TenantUser = { tenant?: string; user: string; role: Role[] };
```

```ts
// src/schemas/id.schema.ts
import { z } from 'zod';

export const idSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'invalid id');
```

```ts
// src/schemas/<entidade>.schema.ts — the payloads API and web share
import { z } from 'zod';
import { idSchema } from './id.schema.js';

export const X_STATUS = ['active', 'archived'] as const;
export type XStatus = (typeof X_STATUS)[number];

const xFields = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.enum(X_STATUS),
  otherId: idSchema.optional(), // reference to another entity: `<name>Id` in payloads and records
});

export const createXSchema = xFields.strict();
export type CreateX = z.infer<typeof createXSchema>;

export const updateXSchema = xFields.partial().strict();
export type UpdateX = z.infer<typeof updateXSchema>;
```

```ts
// src/registry.ts — every exported Zod schema goes here; the structural test fails on one left out
import type { ZodType } from 'zod';
import { idSchema } from './schemas/id.schema.js';
import { createXSchema, updateXSchema } from './schemas/<entidade>.schema.js';

// No payload may carry the tenant: it always comes from the session.
export const TENANT_FORBIDDEN_KEYS = ['tenant', 'tenantid', 'tenant_id', 'orgid', 'org_id', 'company'] as const;

export const schemaRegistry: ReadonlyArray<{ name: string; schema: ZodType }> = [
  { name: 'idSchema', schema: idSchema },
  { name: 'createXSchema', schema: createXSchema },
  { name: 'updateXSchema', schema: updateXSchema },
];
```

`src/index.ts` reexporta tudo (`export * from './response/index.js';` e uma linha por arquivo de schema).

### `packages/db`

```ts
// src/connection.ts
import mongoose from 'mongoose';

export const connect = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};

export const disconnect = async (): Promise<void> => {
  await mongoose.disconnect();
};
```

```ts
// src/tenantScoped.ts — a filter without `Tenant` is a compile-time error, not a runtime check
export const tenantScoped = <F extends { Tenant: string }>(filter: F): F => filter;
```

```ts
// src/models/<entidade>.model.ts
import { X_STATUS, type XStatus } from '@scope/contracts';
import mongoose, { Schema } from 'mongoose';

export interface XDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  name: string;
  status: XStatus;
  Other?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const xSchema = new Schema<XDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: X_STATUS, default: 'active', required: true }, // enum comes from the contract
    Other: { type: Schema.Types.ObjectId, ref: 'Other' }, // reference field = the model name, capitalized
  },
  { timestamps: true },
);

xSchema.index({ Tenant: 1, status: 1 }); // every index starts with the tenant

export const X = mongoose.model<XDocument>('X', xSchema);
```

```ts
// src/index.ts — the only door of the package
export { connect, disconnect } from './connection.js';
export type { XDocument } from './models/<entidade>.model.js';
export { X } from './models/<entidade>.model.js';
export { tenantScoped } from './tenantScoped.js';

import { X } from './models/<entidade>.model.js';

// Called on boot by apps/api/src/server.ts. Every new model enters this list.
export const syncIndexes = async (): Promise<void> => {
  await Promise.all([X.createIndexes()]);
};
```

Banco de teste: `integration` e `e2e` nunca usam o banco do app. O `globalSetup` (`packages/db/tests/setup/globalSetup.ts`) deriva `<banco>_test` da `MONGODB_URI` local, injeta essa URI nos testes e começa de um banco limpo. A limpeza recusa qualquer banco sem "test" no nome:

```ts
export const wipeTestDatabase = async (): Promise<void> => {
  const { name, db } = mongoose.connection;
  if (!db || !/test/i.test(name)) throw new Error(`wipeTestDatabase refused: "${name}" is not a test database.`);
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).filter(
    (collection) => !collection.name.startsWith('system.'),
  );
  await Promise.all(collections.map((collection) => db.collection(collection.name).deleteMany({})));
};
```

### `packages/ui`

Primitivos shadcn/Base UI, um arquivo por componente em `src/components/`. O `components.json` do pacote e o do app apontam o shadcn para cá (`"ui": "@scope/ui/components"`). O pacote não importa CSS: o app declara os tokens do tema e inclui `@source "../../../packages/ui/src"` no CSS de entrada, para o Tailwind gerar as classes usadas no pacote. Regra de negócio, status do domínio e navegação ficam no app.

```tsx
import { Button } from '@scope/ui/components/button';
```

## Pacote novo em `packages/`

Só quando **dois apps** precisam do mesmo código e ele não cabe em `contracts`, `db` ou `ui`. Com um app só, o código fica no app.

1. `packages/<nome>/package.json`, `tsconfig.json` e `src/index.ts`, nos moldes acima.
2. `"@scope/<nome>": "workspace:*"` em cada consumidor; `pnpm install`.
3. Testes: `*.unit.test.ts` já roda (`packages/**`). Teste com banco fora de `packages/db` pede o glob novo no project `integration`.
4. Teste da raiz que importa o pacote: acrescente-o às `devDependencies` da raiz.
5. Ambiente: o manifest do pacote entra nas imagens Docker que instalam dependências.

## App novo em `apps/`

1. `apps/<nome>/package.json` (nome sem escopo, `scripts.dev`) e `tsconfig.json`.
2. Script `dev:<nome>` na raiz: `pnpm --filter <nome> run dev`.
3. `vitest.config.ts`:
   - `unit` e `e2e` já cobrem `apps/*/src/**`; `integration` lista só `apps/api`: acrescente o glob.
   - O alias `@` da raiz aponta para `apps/web/src`. Um segundo front com alias `@` precisa do **próprio project** (nome, `include` e alias dele), e os testes dele saem do `include` do project `unit`.
4. Ambiente: variáveis novas em `.env.example`; back lê `../../.env` (`--env-file-if-exists`), front usa `envDir: '../../'`; porta própria com `strictPort`.
5. Fronteiras: back-end em módulos ganha o próprio teste com `tests/structural/lib/module-scan.ts` (a lib é genérica, a configuração muda por chamador); app com schema Zod próprio tem o registry dele somado no teste de registry.

Um segundo front em outra origem esbarra em duas escolhas que nascem de um app só: a API aceita **uma** origem (`CORS_ORIGIN`) e o cliente HTTP e o dicionário de textos moram em `apps/web/src/lib`. Decida com o segundo front na mão, não antes.

## Ambiente e CI

- **Local**: um `docker-compose.yml` com o banco, a API e o web. API e web usam a mesma imagem de desenvolvimento (só muda o comando), com o repo montado por volume e um volume por `node_modules` de workspace.
- **Produção**: a API é um container que roda `tsx src/server.ts`; o web é um build estático. A sessão é um cookie httpOnly: sirva a API no mesmo site do web (por exemplo, o host do web repassando `/api` para a API), senão navegadores bloqueiam o cookie entre sites.
- **CI**: um job só, com o banco como serviço, rodando o mesmo comando do gate local:

```yaml
jobs:
  build-gate:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:8
        ports: ["37017:27017"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: "24", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run check
        env:
          MONGODB_URI: mongodb://localhost:37017/<projeto>?directConnection=true
```
