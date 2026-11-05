---
name: ethica-architecture
description: Arquitetura do monorepo do Ethica e roteiro para criar projetos nela — pnpm workspaces com apps/ (api, web) e packages/ compartilhados (contracts Zod, db Mongoose, ui shadcn/Base UI); back-end em módulos contidos (src/modules/<módulo>/ com router → controller → service → repository → schema), camada de service como única porta entre módulos e eventos in-process em src/events/; front-end com camada global reutilizável (src/components, src/hooks, src/lib, src/query) e rotas por arquivo com pastas @ locais. Use SEMPRE que for criar um sistema novo nesta arquitetura, um app novo em apps/, um pacote novo em packages/, um módulo, entidade, evento ou provider novo no back-end, um módulo de tela novo, decidir em que camada um código mora, ou explicar e revisar a arquitetura. Trigger em "novo projeto", "criar projeto", "novo sistema", "novo app", "novo pacote", "novo workspace", "novo módulo", "novo evento", "arquitetura", "monorepo", "estrutura do projeto", "onde colocar", "em que camada", "scaffold", "base do projeto".
---

# Arquitetura do Ethica — criar projetos nela

Mapa único da arquitetura e roteiro para criar dentro dela: um sistema novo, um app, um pacote, um módulo de back-end, um módulo de tela. As regras de código de cada app continuam em `apps/api/CLAUDE.md` e na skill `ethica-web-standards`; aqui fica **o que existe, por que existe e onde cada coisa nova nasce**.

Os caminhos apontam para este repositório, que é a implementação de referência. `@ethica/*` é o escopo dos pacotes: num sistema novo, troque pelo escopo dele.

## 1. Intenção

> Faça simplificando o processo: exclua as estruturas antigas e faça de forma nova e limpa,
> sempre com a intenção de diminuir o nível de complexidade.

- Reduzir complexidade é o **resultado** que se busca, não um mecanismo a construir. Não crie helpers, camadas, abstrações, wrappers ou "estruturas que agrupam processos" para entregar algo elegante: isso é justamente o que aumenta a complexidade.
- Muitas vezes o mais simples é fazer de forma **direta**, seguindo o padrão do projeto e usando o que já existe de reutilizável.
- Ao mexer em algo que ficou obsoleto, exclua a estrutura antiga e faça a nova limpa, em vez de empilhar por cima (sem shim, alias de compatibilidade ou código comentado).
- Entre duas soluções que resolvem, vence a que tem menos conceitos e exceções, medida por quão fácil é de compreender, não por quão reaproveitável é.

Na criação de projeto, isso vira regra prática:

- **Copie o molde que já existe** (um módulo, uma rota, um pacote) e apague o que não serve. Não escreva gerador, template, classe base nem pacote "core".
- **Estrutura nasce com conteúdo real**: pasta, pacote, evento ou provider só no primeiro uso. Nada de pasta vazia para o futuro.
- **Subir de camada exige o segundo consumidor** (seção 4). Com um uso só, fica local. Se o segundo consumidor sumir, o código desce de volta.
- **Sistema novo a partir deste**: o domínio antigo é excluído, não desligado nem deixado ao lado.

## 2. Mapa

```
<raiz>/
├── apps/                  # o que roda e é publicado; ninguém importa de um app
│   ├── api/               # Express 5: camada compartilhada + módulos contidos + eventos
│   └── web/               # React 19 + Vite: camada global + rotas por arquivo
├── packages/              # o que é compartilhado; nunca importa de apps/
│   ├── contracts/         # Zod: payloads, enums, envelope da resposta, chaves de mensagem, regra pura de domínio
│   ├── db/                # Mongoose: models, conexão, tenantScoped, busca — único que importa `mongoose`
│   └── ui/                # primitivos shadcn/Base UI, sem regra de negócio
├── tests/structural/      # testes que travam as fronteiras da arquitetura
├── scripts/docs/          # gerador do gateway docs/index.*
├── docs/ · .specs/        # memória do projeto: features vivas, specs congeladas, decisões AD-NNN
├── .agents/skills/        # skills do projeto (symlink em .claude/skills/)
├── AGENTS.md              # regras para qualquer agente (CLAUDE.md importa, GEMINI.md é symlink)
└── package.json · pnpm-workspace.yaml · tsconfig.base.json · biome.json · vitest.config.ts
    .env.example · docker-compose.yml · Dockerfile · Dockerfile.dev
```

Direção das dependências (sempre para a esquerda e para baixo, nunca de volta):

```
contracts ◀── db ◀── api
    ▲
    └──────── web ──▶ ui
```

`web` não importa `db`; `ui` não importa `contracts` nem `db`; pacote nenhum importa app.

Os dois apps têm o mesmo desenho, **camada compartilhada + unidades contidas**:

| App | Camada compartilhada | Unidade contida | Como uma unidade usa a outra |
| --- | --- | --- | --- |
| `apps/api` | `apps/api/src/{config,middlewares,providers,metrics,events}` | `apps/api/src/modules/<módulo>/` | pelo `*.service` do dono (a resposta usa o resultado) ou por evento (não usa) |
| `apps/web` | `apps/web/src/{components,hooks,lib,query}` | `apps/web/src/routes/**/<módulo>/` com pastas `@` | não importa: o código sobe para a camada global |

## 3. Regras que sustentam a arquitetura

Cada regra tem quem a garanta. Regra nova sem garantia apodrece: prefira o teste estrutural.

| Regra | Quem garante |
| --- | --- |
| Pacote exporta o `.ts` direto (`"exports": "./src/index.ts"`), sem build. A API roda com `tsx`, o web empacota com Vite (AD-153) | `package.json` de cada pacote |
| Import relativo sempre com `.js` (`NodeNext`), mesmo apontando para `.tsx` | `tsc` |
| Só `packages/db` importa `mongoose` (AD-010) | `tests/structural/mongoose-boundary.structural.test.ts` |
| Módulo da API só importa de outro o `*.service.js` ou `*.schema.js`; cada model tem um módulo dono; grafo sem ciclo; a camada compartilhada não importa `modules/` (AD-038) | `tests/structural/module-boundary.structural.test.ts` |
| Todo schema Zod está num registry e nenhum aceita chave de tenant (AD-010) | `tests/structural/schema-registry.structural.test.ts` |
| Tenant vem de `req.tenantUser`, nunca do corpo; todo filtro de repository passa por `tenantScoped` | tipo de `tenantScoped` (`packages/db/src/tenantScoped.ts`) |
| `message` da API é chave de `API_MESSAGE_KEYS`; o web traduz uma vez, em `apps/web/src/lib/api/client.api.ts` | tipo `ApiMessageKey` + `translate.helper.unit.test.ts` |
| Um `.env` na raiz para api e web | `apps/api/package.json` (`--env-file-if-exists=../../.env`) e `apps/web/vite.config.ts` (`envDir`) |
| Teste ao lado do arquivo, por sufixo: `*.unit.test.ts(x)`, `*.int.test.ts`, `*.e2e.test.ts`, `*.structural.test.ts` (AD-017) | `vitest.config.ts`; arquivo fora do sufixo não roda em project nenhum |
| Um gate para o repo todo: `pnpm run check` | `.github/workflows/ci.yml` |

## 4. Onde cada código novo nasce

| Vou criar… | Nasce em | Sobe quando |
| --- | --- | --- |
| Payload, enum ou regra pura que API **e** web usam | `packages/contracts/src/schemas/<entidade>.schema.ts` | já nasce compartilhado |
| Schema de params/query e tipo de saída (`*Record`) da API | `apps/api/src/modules/<módulo>/<entidade>.schema.ts` | vai para `contracts` quando o web validar o mesmo payload |
| Model e índice | `packages/db/src/models/<entidade>.model.ts` | — |
| Regra de negócio | `<entidade>.service.ts` do módulo dono | — |
| Efeito em outro módulo | chamada ao service dele ou evento (`references/backend.md`) | — |
| Acesso a serviço externo (e-mail, arquivos, API de terceiro) | `apps/api/src/providers/<nome>.ts`, injetado em `buildApp` | — |
| Componente, hook ou função de uma tela | `@components`, `@hooks`, `@utils` da rota | 2+ rotas irmãs → `@` do pai; outro módulo → `apps/web/src/{components,hooks,lib}` |
| Chamada à API | `@query/` da rota | entidade usada por 2+ rotas → `apps/web/src/query/<entidade>.ts` |
| Primitivo visual sem regra de negócio | `packages/ui/src/components/` | — |
| Composição que conhece rota, sessão, tradução ou domínio | `apps/web/src/components/` | — |
| Código igual em dois apps que não cabe em `contracts`, `db` ou `ui` | no app, até existir o segundo app | pacote novo (`references/monorepo.md`), com AD |

## 5. Roteiros

| Tarefa | Ordem resumida | Detalhe |
| --- | --- | --- |
| Funcionalidade nova de ponta a ponta | glossário → `contracts` → `db` → módulo da API → `query` e rota do web → permissão → docs | `references/backend.md` + `references/frontend.md` |
| Entidade ou módulo novo na API | schema → repository → service → controller → router → `app.ts` → registries | `references/backend.md` |
| Evento ou provider novo | `event-types.ts` → subscriber → `subscribers/index.ts` → `emit` no service de origem | `references/backend.md` |
| Módulo de tela novo | `query/<entidade>.ts` → pasta da rota com `index.tsx` → navegação → traduções | `references/frontend.md` + skill `ethica-web-standards` |
| Pacote novo em `packages/` | manifest + `tsconfig` + `src/index.ts` → `workspace:*` nos consumidores → Docker → AD | `references/monorepo.md` |
| App novo em `apps/` | manifest + `tsconfig` → script na raiz → project no Vitest → env e porta → Docker → `CLAUDE.md` do app | `references/monorepo.md` |
| Sistema novo nesta arquitetura | copiar a base → podar o domínio → renomear o escopo → primeira fatia do domínio novo → docs → gate | `references/new-project.md` |

A cada camada criada, rode `pnpm -r exec tsc --noEmit`: o compilador aponta o que falta ligar antes de seguir para a próxima.

## 6. Nunca

- Pastas por camada técnica na API (`apps/api/src/{routers,controllers,services,repositories}`): o teste estrutural recusa.
- Importar repository, controller ou model de outro módulo; importar entre módulos de `apps/web/src/routes/`.
- Pacote genérico (`shared`, `core`, `utils`, `common`), classe base de service ou repository, wrapper sobre biblioteca que só repassa argumentos. Service, controller e repository são **funções exportadas**.
- Store global no web (Zustand, Redux, contexto de dados): TanStack Query é a fonte, filtro e paginação vivem na URL.
- Build ou `dist` de pacote, alias de compatibilidade, re-export "para não quebrar", pasta ou arquivo vazio.
- Fila ou broker externo para evento: o bus é in-process (AD-039). Precisa de entrega garantida? É decisão nova, com AD.
- Texto pronto em erro da API, tenant vindo do corpo, `mongoose` fora de `packages/db`.

## 7. Ao terminar

- [ ] Nome novo de domínio está em `docs/glossary.md` e é o mesmo em todas as camadas.
- [ ] Todo arquivo novo tem dono claro (módulo, rota ou camada) e nenhum ficou órfão ao lado do antigo.
- [ ] Registries em dia: `packages/contracts/src/registry.ts`, `apps/api/src/modules/schema.registry.ts`, `DB_OWNERSHIP` em `tests/structural/module-boundary.structural.test.ts`, `syncIndexes()` em `packages/db/src/index.ts`.
- [ ] Workspace novo aparece em: `AGENTS.md` (mapa), `docs/architecture.md`, `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, `vitest.config.ts`.
- [ ] Decisão não óbvia virou `AD-NNN` em `.specs/STATE.md`; `feature.md` atualizado (skill `ethica-docs`).

```bash
pnpm vitest run --project unit --project structural   # rápido, depois de mexer em fronteira
pnpm run check                                        # tsc + biome + vitest (precisa do banco: RUN_BOOK.md)
(cd apps/web && pnpm run build)                       # quando o web mudou
```

## Referências

| Quando | Arquivo |
| --- | --- |
| Arquivos da raiz, os três pacotes, criar pacote ou app | `references/monorepo.md` |
| Composition root, camada compartilhada, anatomia do módulo, camada de service, eventos, providers, testes | `references/backend.md` |
| Entrada do app, camada global, escada de promoção, caminho do dado, segundo front | `references/frontend.md` |
| Sistema novo: o que é fundação e o que é domínio, poda, renomeação, criação do zero | `references/new-project.md` |
