# Sistema novo nesta arquitetura

Dois caminhos. O primeiro é o padrão: foi assim que o Ethica nasceu de um projeto anterior (AD-102, plano em `.specs/features/fundacao-ethica/plans/`).

## Fundação × domínio

Fundação vai junto para o sistema novo; domínio é excluído. Na dúvida, pergunte: outro produto, de outro ramo, precisaria disso igual?

| Onde | Fundação (leva) | Domínio (exclui) |
| --- | --- | --- |
| Raiz | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `docker-compose.yml`, `Dockerfile*`, `.github/workflows/ci.yml`, `tests/structural/`, `scripts/docs/` | variáveis de env e serviços do compose que só o domínio usa |
| `packages/contracts` | `response/`, `registry.ts`, `types.ts`, schemas de id, data, acesso, convite, conta e permissão | schemas das entidades do domínio; os módulos do domínio na matriz de permissões; chaves de mensagem do domínio |
| `packages/db` | conexão, `tenantScoped`, criptografia, datas, busca de texto, banco de teste; models de tenant, usuário, sessão, convite e diário de bordo | models do domínio e seus índices de busca |
| `packages/ui` | tudo | — |
| `apps/api` | `app.ts`, `server.ts`, `config/`, `middlewares/`, `metrics/`, `events/` (bus e registro, com o mapa vazio), provider de e-mail e de arquivos, módulo `identity` | módulos do domínio, seus subscribers, providers de terceiros do domínio, agendamentos em `server.ts` |
| `apps/web` | `main.tsx`, `router.tsx`, `index.css`, `lib/`, `hooks/`, componentes padrão de `components/`, `query/session.ts` e as de conta e usuário, `routes/__root.tsx`, `_public/`, o shell de `_private/` (layout, navegação, início), conta e usuários | rotas do domínio, `query/` e `*-labels.ts` do domínio, textos do domínio no dicionário |
| Harness e docs | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/skills/`, `.claude/settings.json`, `.mcp.json`, `docs/templates/`, `.specs/STATE.md` | `PRODUCT.md`, `docs/glossary.md`, `docs/roadmap.md`, `docs/features/*`, `.specs/features/*` (recomeçam do zero) |

As decisões herdadas em `.specs/STATE.md` **mantêm o número**: skills e comentários do código citam `AD-NNN`. As novas continuam a numeração, e a primeira registra a fundação do sistema novo.

## Caminho A — a partir desta base

1. **Plano em arquivo** no repo novo (`.specs/plans/`): escopo, o que vem e o que fica de fora.
2. **Copiar só o versionado**, sem histórico: `git archive HEAD | tar -x -C <pasta-nova>` e `git init`. Nunca copie `.env`, `ACC.md`, `node_modules`, `dist`.
3. **Podar o domínio de cima para baixo**, rodando `pnpm -r exec tsc --noEmit` a cada camada (o compilador aponta a próxima ponta solta):
   1. `apps/web`: rotas do domínio, entradas de navegação, `query/` e rótulos;
   2. `apps/api`: módulos, as linhas deles em `app.ts`, `modules/schema.registry.ts`, `events/subscribers/` e `events/event-types.ts`;
   3. `packages/db`: models, exports e `syncIndexes()` em `src/index.ts`, índices de busca, `DB_OWNERSHIP` no teste estrutural;
   4. `packages/contracts`: schemas, `src/index.ts`, `src/registry.ts`, módulos da matriz de permissões, chaves de mensagem (e as traduções no web).
4. **Renomear escopo e marca** (lista abaixo).
5. **Produto**: `PRODUCT.md` e `docs/glossary.md` do domínio novo, antes do primeiro nome de código.
6. **Primeira fatia do domínio**: um módulo de ponta a ponta (`references/backend.md`, depois `references/frontend.md`). Ela prova que a base está ligada.
7. **Registro**: `feature.md` da fundação, `AD-NNN`, `pnpm docs:sync`.
8. **Gate verde** e primeiro commit.

### Onde o nome antigo mora

| Grupo | Lugares |
| --- | --- |
| Escopo dos pacotes | `name` em `packages/*/package.json`; dependências em `apps/*/package.json` e na raiz; todo `import … from '@ethica/…'`; aliases em `apps/web/components.json` e `packages/ui/components.json` |
| Nome do repo | `name` da raiz e o `--filter` do `Dockerfile` |
| Banco, storage e serviços | `.env.example`, `docker-compose.yml` (containers, banco, bucket, credenciais de dev), banco de teste em `vitest.config.ts`, `.github/workflows/ci.yml`, marcador de env em `packages/db/tests/setup/globalSetup.ts`, destino do `/api` em `vercel.json` |
| Marca na tela e fora dela | `apps/web/index.html`, `apps/web/public/manifest.webmanifest`, `apps/web/public/sw.js`, ícones, `apps/web/src/theme.css`, textos do dicionário, e-mails montados no servidor, valores padrão de `apps/api/src/config/env.config.ts` |
| Harness | pastas e `name:` das skills, symlinks em `.claude/skills/`, referências cruzadas entre skills, `AGENTS.md`, `CLAUDE.md` da raiz e dos apps, mensagem do hook em `scripts/docs/sync-docs.mjs`, `RUN_BOOK.md`, `docs/architecture.md`, `packages/ui/README.md` |

Feche com a varredura: `git grep -Ii '<nome-antigo>'` só pode devolver histórico (decisões herdadas). Nome antigo em comentário ou em mensagem de hook passa pelo gate sem acusar.

## Caminho B — do zero

Quando não há base para copiar. Cada passo termina com `tsc` e Biome verdes; nada é criado antes de ter uso.

1. **Raiz**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `vitest.config.ts`, `.gitignore`, `.env.example` (`references/monorepo.md`).
2. **`packages/contracts`**: envelope da resposta, chaves de mensagem, schema de id e o registry.
3. **`packages/db`**: conexão, `tenantScoped`, models de tenant, usuário e sessão, ajuda de banco de teste.
4. **`apps/api`**: `config/env`, middlewares de erro, validação, autenticação, autorização e tenant; `events/` (bus, mapa vazio, registro); `app.ts` e `server.ts`; módulo `identity`; `modules/schema.registry.ts`.
5. **`tests/structural/`**: fronteira de módulos, `mongoose` só no `db`, registry de schemas. Entram **antes** do segundo módulo: é o que impede a arquitetura de escorregar.
6. **`packages/ui`**: `components.json` e só os primitivos que as primeiras telas usam.
7. **`apps/web`**: `vite.config.ts`, `main.tsx`, `router.tsx`, `routes/__root.tsx`, entrada pública, layout privado com a guarda de sessão, `lib/api/client.api.ts`, `lib/helpers/translate.helper.ts`, `query/session.ts` e os componentes padrão de página.
8. **Harness e docs**: `AGENTS.md`, skills, gerador do gateway, `.specs/STATE.md` com a primeira decisão, CI.
9. **Ambiente**: `docker-compose.yml`, `Dockerfile.dev`, `RUN_BOOK.md`.

## Pronto para o primeiro módulo de domínio quando

- [ ] `pnpm run check` verde, com os três testes estruturais rodando.
- [ ] Entrar no sistema funciona de ponta a ponta: sessão em cookie, `req.tenantUser` montado, guarda de rota no web.
- [ ] Erro da API chega traduzido na tela (chave → dicionário).
- [ ] Um `.env` na raiz serve os dois apps; `docker compose up` sobe banco, api e web.
- [ ] `AGENTS.md`, `STATE.md` e o gateway de docs existem, e a varredura do nome antigo está limpa.
