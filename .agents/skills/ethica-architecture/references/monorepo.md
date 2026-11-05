# Monorepo: raiz, pacotes e workspaces novos

pnpm workspaces (AD-001): `apps/*` roda, `packages/*` é compartilhado. Um install, um lockfile, um gate.

## Arquivos da raiz

| Arquivo | Papel |
| --- | --- |
| `pnpm-workspace.yaml` | `apps/*` e `packages/*`; `overrides` fixa uma versão única no repo inteiro (hoje `vite`, o motivo está comentado no arquivo); `allowBuilds` libera addon nativo |
| `package.json` | scripts do repo (`dev:api`, `dev:web`, `check`, `format`, `docs:*`); `packageManager` e `engines.node` fixados; `devDependencies` só de ferramenta (Biome, tsx, TypeScript, Vitest) e dos pacotes que os testes da raiz importam |
| `tsconfig.base.json` | `NodeNext`, `strict`, `verbatimModuleSyntax`, `noEmit`. Cada workspace estende e só acrescenta `include` (os de React também `jsx`, `lib` de DOM e o alias `@`) |
| `biome.json` | formatação e lint do repo todo; substitui ESLint e Prettier |
| `vitest.config.ts` | os quatro `projects` por sufixo (`unit`, `integration`, `e2e`, `structural`), o env de teste da API e o alias `@` do web |
| `.env.example` | todas as variáveis de api e web. O `.env` real nunca é commitado |
| `docker-compose.yml` + `Dockerfile.dev` | ambiente local: banco, storage, api e web numa imagem só de desenvolvimento |
| `Dockerfile` + `railway.json` + `vercel.json` | produção: API em container, web estático com `/api` repassado para a API (AD-153) |
| `.github/workflows/ci.yml` | `pnpm run check` + `pnpm docs:check` a cada push |

Convenções que valem para todo workspace:

- `"type": "module"`, `"private": true`, `"version": "0.0.0"`. Dependência entre workspaces por `"workspace:*"`.
- Sem etapa de build em pacote: `"exports"` aponta para o `.ts`. Quem consome compila (Vite) ou executa direto (`tsx`).
- Portas fora do padrão para não colidir com outro projeto na mesma máquina (web `15173` com `strictPort`, API `18080`, banco `37017`). O motivo do `strictPort` está comentado em `apps/web/vite.config.ts`.
- Variável que o navegador lê tem prefixo `VITE_`; o resto fica só no servidor e é validado no import por `apps/api/src/config/env.config.ts`.

## Manifest de um workspace

```json
{
  "name": "@ethica/<nome>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "dependencies": { "@ethica/contracts": "workspace:*" }
}
```

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

App usa o nome sem escopo (`api`, `web`) e tem `scripts.dev`. `packages/ui` exporta por arquivo (`"./components/*": "./src/components/*.tsx"`), para o app carregar só o que usa.

## Os três pacotes

| Pacote | Entra | Nunca entra |
| --- | --- | --- |
| `packages/contracts` | schemas Zod de payload (`createXSchema`, `updateXSchema`, `.strict()`), enums como `as const` + tipo derivado, tipos `z.infer`, envelope da resposta (`respObj`, `badRespObj`), `API_MESSAGE_KEYS`, regra pura usada pelos dois lados (`hasPermission`), `schemaRegistry` | I/O, API só de Node ou só de navegador, React, Mongoose. Única dependência: `zod` |
| `packages/db` | um `<entidade>.model.ts` por model (interface `XDocument`, schema, índices começando por `Tenant`, `mongoose.model`), conexão, `tenantScoped`, busca de texto, ajuda de data e de banco de teste, `syncIndexes()` | HTTP, regra de negócio de um módulo. Exceção já decidida: transição que toca várias collections |
| `packages/ui` | primitivos shadcn/Base UI, tokens semânticos vindos do tema do app (`packages/ui/README.md`) | CSS de marca, roteador, sessão, chamada à API, status de domínio |

Molde de contrato: `packages/contracts/src/schemas/transaction.schema.ts`. Molde de model: `packages/db/src/models/transaction.model.ts`.

Todo schema novo entra em `packages/contracts/src/index.ts` (export) e em `packages/contracts/src/registry.ts`. Todo model novo entra em `packages/db/src/index.ts` (export do model e do tipo) e na lista de `syncIndexes()`.

## Pacote novo em `packages/`

Só quando **dois apps** precisam do mesmo código e ele não cabe em `contracts`, `db` ou `ui`. Um app só: o código fica no app.

1. `packages/<nome>/package.json`, `tsconfig.json` e `src/index.ts` (moldes acima).
2. `"@ethica/<nome>": "workspace:*"` em cada consumidor; `pnpm install`.
3. Docker: `COPY packages/<nome>/package.json` em `Dockerfile` e `Dockerfile.dev`; `COPY packages/<nome>` no `Dockerfile` se a API usa; volume `/app/packages/<nome>/node_modules` em `docker-compose.yml`.
4. Testes: `*.unit.test.ts` já roda (`packages/**`). Teste com banco fora de `packages/db` pede o glob novo no project `integration` de `vitest.config.ts`.
5. Teste da raiz que importa o pacote: acrescente-o às `devDependencies` da raiz.
6. Registre: linha no mapa de `AGENTS.md`, `docs/architecture.md` e uma `AD-NNN` (pacote novo é decisão não óbvia).

## App novo em `apps/`

1. `apps/<nome>/package.json` (nome sem escopo, `scripts.dev`), `tsconfig.json` e `src/index.ts`, no molde de `apps/api` ou `apps/web`.
2. Script `dev:<nome>` na raiz: `pnpm --filter <nome> run dev`.
3. `vitest.config.ts`:
   - `unit` e `e2e` já cobrem `apps/*/src/**`; `integration` lista só `apps/api`: acrescente o glob.
   - O alias `@` da raiz aponta para `apps/web/src`. Um segundo front com alias `@` precisa do **próprio project** (nome, `include` e alias dele), e os testes dele saem do `include` do project `unit`, que hoje pega `apps/*`.
4. Ambiente: variáveis novas em `.env.example`; back lê `../../.env` (`--env-file-if-exists`), front usa `envDir: '../../'`; porta própria com `strictPort`.
5. Docker: manifest no `COPY` de `Dockerfile.dev`, serviço e volume de `node_modules` em `docker-compose.yml`; publicação própria (container ou estático).
6. Fronteiras:
   - back-end em módulos reaproveita `tests/structural/lib/module-scan.ts` (genérico, a configuração muda por chamador) num teste estrutural próprio;
   - `mongoose-boundary` já varre `apps/**`;
   - `schema-registry` valida a união dos registries: app com schema Zod próprio precisa do registry dele somado ali.
7. Registre: `apps/<nome>/CLAUDE.md` (stack + verificação), linha no mapa de `AGENTS.md`, `docs/architecture.md`, `feature.md` e `AD-NNN`.

Um segundo front em outra origem esbarra em duas escolhas que hoje são de um app só: a API aceita **uma** origem (`CORS_ORIGIN`) e o cliente HTTP e o dicionário `t()` moram em `apps/web/src/lib`. Decida com o segundo front na mão (AD), não antes.
