---
name: monorepo-architecture
description: Arquitetura de referência para sistemas full stack TypeScript em monorepo pnpm, com roteiro para criar e evoluir projetos nela — workspaces apps/ (api, web) e packages/ compartilhados (contracts com Zod, db com Mongoose, ui com shadcn/Base UI); back-end Express em módulos contidos (src/modules/<módulo>/ com router → controller → service → repository → schema), camada de service como única porta entre módulos e eventos de domínio in-process em src/events/; front-end React com camada global reutilizável (src/components, src/hooks, src/lib, src/query) e rotas por arquivo com pastas @ locais. Documento autossuficiente, sem dependência do projeto onde está. Use SEMPRE que for criar um sistema novo, levar um projeto existente (MVP) para esta arquitetura, criar app em apps/, pacote em packages/, módulo, entidade, evento ou provider no back-end, módulo de tela no front-end, decidir em que camada um código mora, ou explicar e revisar a arquitetura. Trigger em "novo projeto", "criar projeto", "novo sistema", "mvp", "novo app", "novo pacote", "novo workspace", "novo módulo", "novo evento", "arquitetura", "monorepo", "estrutura do projeto", "onde colocar", "em que camada", "scaffold", "base do projeto".
---

# Arquitetura de referência — monorepo modular

Tudo que é preciso para chegar nesta arquitetura está nesta pasta: o desenho, as regras, o código-base e a ordem de criação. Nada aqui depende de outro arquivo do projeto onde o documento for colocado.

Convenções do texto: `@scope/*` é o escopo npm dos pacotes (troque pelo do projeto); `<módulo>` e `<entidade>` são nomes do domínio; nos exemplos de código, `X` e `x` ocupam o lugar da entidade.

## 1. Intenção

> Faça simplificando o processo: exclua as estruturas antigas e faça de forma nova e limpa,
> sempre com a intenção de diminuir o nível de complexidade.

- Reduzir complexidade é o **resultado** que se busca, não um mecanismo a construir. Não crie helpers, camadas, abstrações, wrappers ou "estruturas que agrupam processos" para entregar algo elegante: isso é justamente o que aumenta a complexidade.
- Muitas vezes o mais simples é fazer de forma **direta**, seguindo o padrão do projeto e usando o que já existe de reutilizável.
- Ao mexer em algo que ficou obsoleto, exclua a estrutura antiga e faça a nova limpa, em vez de empilhar por cima (sem shim, alias de compatibilidade ou código comentado).
- Entre duas soluções que resolvem, vence a que tem menos conceitos e exceções, medida por quão fácil é de compreender, não por quão reaproveitável é.

Na criação de projeto, isso vira regra prática:

- **Copie o molde** (os esqueletos das referências, ou um módulo e uma rota que já existam no projeto) e apague o que não serve. Não escreva gerador, classe base nem pacote "core".
- **Estrutura nasce com conteúdo real**: pasta, pacote, evento ou provider só no primeiro uso. Nada de pasta vazia para o futuro.
- **Subir de camada exige o segundo consumidor** (seção 5). Com um uso só, fica local. Se o segundo consumidor sumir, o código desce de volta.
- **Migração**: cada passo termina com a estrutura antiga excluída, não desligada nem deixada ao lado.

## 2. Stack de referência

| Camada | Escolha |
| --- | --- |
| Monorepo | pnpm workspaces, Node 24, TypeScript 5 em ESM (`NodeNext`), Biome (lint e formatação), Vitest (um runner, `projects` por tipo de teste) |
| Contratos | Zod 4 |
| Banco | MongoDB com Mongoose, só dentro de `packages/db` |
| API | Express 5, executada com `tsx`, sem etapa de compilação |
| Web | React 19, Vite, TanStack Router (rotas por arquivo), TanStack Query, react-hook-form, Tailwind 4, shadcn/Base UI |

Trocar uma peça (outro banco, outro framework HTTP) não muda as regras: muda só quem ocupa a camada.

## 3. Mapa

```
<raiz>/
├── apps/                  # o que roda e é publicado; ninguém importa de um app
│   ├── api/               # camada compartilhada + módulos contidos + eventos
│   └── web/               # camada global + rotas por arquivo
├── packages/              # o que é compartilhado; nunca importa de apps/
│   ├── contracts/         # Zod: payloads, enums, envelope da resposta, chaves de mensagem, regra pura de domínio
│   ├── db/                # models, conexão, filtro por tenant — único que importa `mongoose`
│   └── ui/                # primitivos visuais, sem regra de negócio
├── tests/structural/      # testes que travam as fronteiras da arquitetura
└── package.json · pnpm-workspace.yaml · tsconfig.base.json · biome.json · vitest.config.ts · .env.example
```

Direção das dependências (nunca de volta):

```
contracts ◀── db ◀── api
    ▲
    └──────── web ──▶ ui
```

`web` não importa `db`; `ui` não importa `contracts` nem `db`; pacote nenhum importa app.

Os dois apps têm o mesmo desenho, **camada compartilhada + unidades contidas**:

| App | Camada compartilhada | Unidade contida | Como uma unidade usa a outra |
| --- | --- | --- | --- |
| `apps/api` | `src/{config,middlewares,providers,metrics,events}` | `src/modules/<módulo>/` | pelo `*.service` do dono (a resposta usa o resultado) ou por evento (não usa) |
| `apps/web` | `src/{components,hooks,lib,query}` | `src/routes/**/<módulo>/` com pastas `@` | não importa: o código sobe para a camada global |

## 4. Regras e quem garante cada uma

Regra sem garantia apodrece. As três primeiras fronteiras são travadas por teste (`references/structural-tests.md`).

| Regra | Quem garante |
| --- | --- |
| Módulo da API só importa de outro o `*.service.js` ou `*.schema.js`; cada model tem um módulo dono; grafo sem ciclo; a camada compartilhada não importa `modules/`; sem pastas por camada técnica | `module-boundary.structural.test.ts` |
| Só `packages/db` importa `mongoose` | `db-boundary.structural.test.ts` |
| Todo schema Zod está num registry e nenhum aceita chave de tenant | `schema-registry.structural.test.ts` |
| Tenant vem da sessão (`req.tenantUser`), nunca do corpo; todo filtro de repository passa por `tenantScoped` | tipo de `tenantScoped`: filtro sem `Tenant` não compila |
| `message` da API é sempre uma **chave** do contrato; o web traduz uma vez, no cliente HTTP | tipo `ApiMessageKey` em `respObj`, `badRespObj` e nos erros |
| Pacote exporta o `.ts` direto, sem build | `"exports": "./src/index.ts"` em cada pacote |
| Import relativo sempre com `.js`, mesmo apontando para `.tsx` | `tsc` (`NodeNext`) |
| Um `.env` na raiz para todos os apps | `--env-file-if-exists=../../.env` na API, `envDir: '../../'` no Vite |
| Teste ao lado do arquivo, por sufixo: `*.unit.test.ts(x)`, `*.int.test.ts`, `*.e2e.test.ts`, `*.structural.test.ts` | `vitest.config.ts`; arquivo fora do sufixo não roda |
| Um gate para o repo todo: `pnpm run check` (tipos + Biome + testes) | CI |
| Um nome por conceito, em inglês no código, igual em contrato, model, módulo, rota e tela | revisão |

Projeto de um cliente só (sem tenant): saem `Tenant` do filtro e a checagem de chave proibida no registry; o resto não muda.

## 5. Onde cada código novo nasce

| Vou criar… | Nasce em | Sobe quando |
| --- | --- | --- |
| Payload, enum ou regra pura que API **e** web usam | `packages/contracts/src/schemas/<entidade>.schema.ts` | já nasce compartilhado |
| Schema de params/query e tipo de saída (`*Record`) da API | `apps/api/src/modules/<módulo>/<entidade>.schema.ts` | vai para `contracts` quando o web validar o mesmo payload |
| Model e índice | `packages/db/src/models/<entidade>.model.ts` | — |
| Regra de negócio | `<entidade>.service.ts` do módulo dono | — |
| Efeito em outro módulo | chamada ao service dele ou evento (`references/backend.md`) | — |
| Acesso a serviço externo (e-mail, arquivos, API de terceiro) | `apps/api/src/providers/<nome>.ts`, injetado na montagem do app | — |
| Componente, hook ou função de uma tela | `@components`, `@hooks`, `@utils` da rota | 2+ rotas irmãs → `@` do pai; outro módulo → `apps/web/src/{components,hooks,lib}` |
| Chamada à API | `@query/` da rota | entidade usada por 2+ rotas → `apps/web/src/query/<entidade>.ts` |
| Primitivo visual sem regra de negócio | `packages/ui/src/components/` | — |
| Composição que conhece rota, sessão, tradução ou domínio | `apps/web/src/components/` | — |
| Código igual em dois apps que não cabe em `contracts`, `db` ou `ui` | no app, até existir o segundo app | pacote novo (`references/monorepo.md`) |

## 6. Roteiros

| Tarefa | Ordem resumida | Detalhe |
| --- | --- | --- |
| Sistema novo, do zero | raiz → `contracts` → `db` → `api` → testes estruturais → `ui` → `web` | `references/adoption.md` |
| Levar um projeto existente (MVP) para esta arquitetura | diagnóstico → raiz e `apps/` → extrair `contracts` e `db` → módulos da API, um domínio por vez → camada global e rotas do web | `references/adoption.md` |
| Funcionalidade nova de ponta a ponta | nome do conceito → `contracts` → `db` → módulo da API → `query` e rota do web | `references/backend.md` + `references/frontend.md` |
| Entidade ou módulo novo na API | schema → repository → service → controller → router → montagem → registries | `references/backend.md` |
| Evento ou provider novo | mapa de eventos → subscriber → registro → `emit` no service de origem | `references/backend.md` |
| Módulo de tela novo | `query/<entidade>.ts` → pasta da rota com `index.tsx` → navegação → textos | `references/frontend.md` |
| Pacote ou app novo | manifest + `tsconfig` → `workspace:*` nos consumidores → Vitest → ambiente | `references/monorepo.md` |

A cada camada criada, rode `pnpm -r exec tsc --noEmit`: o compilador aponta o que falta ligar antes de seguir para a próxima.

## 7. Nunca

- Pastas por camada técnica na API (`src/routers`, `src/controllers`, `src/services`, `src/repositories`).
- Importar repository, controller ou model de outro módulo; importar entre módulos de `routes/`.
- Pacote genérico (`shared`, `core`, `utils`, `common`), classe base de service ou repository, wrapper sobre biblioteca que só repassa argumentos. Service, controller e repository são **funções exportadas**.
- Store global no web (Zustand, Redux, contexto de dados): TanStack Query é a fonte; filtro e paginação vivem na URL.
- Build ou `dist` de pacote, alias de compatibilidade, re-export "para não quebrar", pasta ou arquivo vazio.
- Fila ou broker externo para evento entre módulos: o bus é in-process. Entrega garantida é outra decisão, tomada quando o caso existir.
- Texto pronto em erro da API, tenant vindo do corpo, `mongoose` fora de `packages/db`.

## 8. Pronto quando

- [ ] Todo arquivo novo tem dono claro (módulo, rota ou camada) e nenhum ficou órfão ao lado do antigo.
- [ ] Registries em dia: `packages/contracts/src/registry.ts`, `apps/api/src/modules/schema.registry.ts`, a tabela de donos em `tests/structural/module-boundary.structural.test.ts` e `syncIndexes()` em `packages/db/src/index.ts`.
- [ ] Workspace novo aparece no `vitest.config.ts` e nos arquivos de ambiente (Docker, CI).
- [ ] O gate passa:

```bash
pnpm vitest run --project unit --project structural   # rápido, depois de mexer em fronteira
pnpm run check                                        # tsc + biome + vitest (integration e e2e precisam do banco)
(cd apps/web && pnpm run build)                       # quando o web mudou
```

## Referências

| Quando | Arquivo |
| --- | --- |
| Arquivos da raiz, manifests, os três pacotes com código-base, criar pacote ou app, ambiente e CI | `references/monorepo.md` |
| Montagem do app, camada compartilhada, anatomia do módulo, camada de service, eventos, providers, testes | `references/backend.md` |
| Entrada do app, camada global, escada de promoção, rotas e pastas `@`, caminho do dado, formulário | `references/frontend.md` |
| Os testes que travam as fronteiras, prontos para copiar | `references/structural-tests.md` |
| Aplicar num projeto: do zero ou a partir de um MVP existente | `references/adoption.md` |
