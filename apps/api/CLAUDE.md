# Ethica API — Regras do Back-End

Back-end do Ethica: multi-tenant, Express 5 + Mongoose (via `@ethica/db`) sobre um único MongoDB, front-end em `apps/web`. Organizado em **módulos contidos** (AD-038) com um **event bus in-process** (AD-039) para efeitos colaterais entre módulos.

## Stack

Express 5 + TypeScript 5 (`moduleResolution: nodenext` — todo import relativo leva `.js` explícito) + Mongoose (só `@ethica/db` importa `mongoose` — nenhum model fora dali, AD-010, verificado por `mongoose-boundary.structural.test.ts`) + Zod 4 (validação de entrada, `@ethica/contracts` + schemas locais por módulo) + Vitest 4 (`unit`/`integration`/`e2e`/`structural`, AD-017) + Biome 2.

## Estrutura

```
apps/api/src/
├── app.ts / server.ts / index.ts   # composition root: monta routers, injeta providers, registerAllSubscribers()
├── config/ middlewares/ providers/ metrics/   # camada compartilhada — nunca importa de modules/
├── events/                         # event bus in-process (AD-039)
│   ├── event-bus.ts                # DomainEventBus: emit/on/off/listenerCount
│   ├── event-types.ts              # DomainEventMap
│   ├── index.ts
│   └── subscribers/                # um *.subscriber.ts por consumidor + registerAllSubscribers()
├── providers/datajudClient.ts      # API Pública do Datajud (AD-105), injetado em buildApp
├── providers/pdfRenderer.ts        # HTML → PDF com Chromium (AD-119), injetado em buildApp
├── providers/fileStorage.ts        # arquivos do tenant em bucket S3 (AD-120), injetado em buildApp
└── modules/
    ├── schema.registry.ts          # apiSchemaRegistry — schemas Zod locais do app
    ├── identity/                   # auth + platform + invite + conta (User/Session/Tenant/Invite)
    ├── pericia/                    # Pericia + Prazo (AD-109) + Parte (AD-117) + importação PDF/CSV (AD-114, AD-118) — núcleo, não depende de ninguém
    ├── agenda/                     # Compromisso — vistoria, audiência, reunião; feed iCal e aviso diário de prazos
    ├── financeiro/                 # Lancamento — honorários (com parcelas, AD-111) e despesas; resumo, fluxo, categorias
    ├── prospeccao/                 # Oportunidade + busca no Datajud; converte em perícia
    └── documentos/                 # PDFs (AD-119) e exportação ZIP (AD-122) — sem model, só lê os services dos outros
```

Cada `modules/<modulo>/` é **auto-contido**: `<entidade>.router.ts .controller.ts .service.ts .repository.ts .schema.ts` + testes colocalizados (`.unit.test.ts .int.test.ts .e2e.test.ts`, nunca pasta `__test__` separada — AD-017). Um módulo pode agrupar mais de uma entidade (`identity`) quando elas compartilham dono de collection ou fronteira de domínio — granularidade é por **contexto**, não 1:1 com arquivo.

## Regra central: um módulo só fala com o *service* de outro

Nunca repository, nunca model do `@ethica/db`, nunca controller de outro módulo. Dado de banco de outro domínio chega via função exposta pelo service dono — nunca acesso direto.

```ts
// modules/agenda/compromisso.service.ts
import * as periciaService from '../pericia/pericia.service.js';
import * as compromissoRepository from './compromisso.repository.js';
```

Enriquecimento cross-módulo (número do processo, nome do usuário) é **uma consulta em lote `$in` por collection referenciada** (`periciaService.findResumosByIds`), nunca uma consulta por item num loop; referência ausente vira **campo ausente**, nunca `null`.

Service expõe **funções** que delegam ao repository (`export const x = (a, b) => repository.x(a, b)`), nunca alias (`export const x = repository.x`): o alias é avaliado no import e quebra o `vi.mock` do repository nos testes.

Grafo atual: `agenda`, `financeiro` e `prospeccao` → `pericia`; `agenda` → `identity` (dono do link do feed e destinatários do aviso); `documentos` → todos os outros (só leitura, ninguém depende dele); `pericia` e `identity` não dependem de ninguém (AD-106, AD-109, AD-119).

### Ownership do `@ethica/db` (quem importa o quê)

| Módulo | Valores do `@ethica/db` só dele |
| ------ | ------------------------------- |
| `identity` | `Tenant User Session Invite transitionTenantStatus` (inclui identidade dos documentos e cota de arquivos, AD-120) |
| `pericia` | `Pericia Prazo Parte` |
| `agenda` | `Compromisso` |
| `financeiro` | `Lancamento` |
| `prospeccao` | `Oportunidade` |

Helpers sem dono (`tenantScoped`, `hashToken`, datas, tipos) podem ser importados por qualquer módulo — a tabela só restringe **models e transições de negócio**. A tabela vive de verdade em `tests/structural/module-boundary.structural.test.ts`(`DB_OWNERSHIP`) — atualizar os dois lugares (aqui e lá) ao mudar o dono de algo.

### Teste estrutural que garante isso: `tests/structural/module-boundary.structural.test.ts` (AD-038)

Varre `apps/api/src/modules/**` (fora de `*.test.ts`) e falha se:

- **(a)** um import relativo de `modules/A` para `modules/B` não terminar em `.service.js`/`.schema.js`;
- **(b)** um módulo importar (por valor, não `import type`) um nome da tabela de ownership que não é dele;
- **(c)** o grafo de dependência entre módulos tiver ciclo;
- **(d)** `src/{routers,controllers,services,repositories,workers,ws}` ou `src/authDeps.ts` existirem;
- **(e)** a camada compartilhada (`config/middlewares/providers/metrics/events`) importar de `modules/` — exceto `events/subscribers/**`.

Cada regra tem self-check com fixture sintético num diretório temporário (mesmo molde de `mongoose-boundary.structural.test.ts`). Rodar `pnpm vitest run --project structural` depois de mexer em import cross-módulo.

## Camada de schema (`<entidade>.schema.ts`)

Um arquivo por entidade concentra: schemas Zod de **entrada** locais (params/query — nunca soltos no router), re-export dos schemas/tipos de `@ethica/contracts` que o módulo usa, e os tipos de **saída** (`*Record`, inputs de repository, tipos de query). Routers não têm `z.object` nem tipo local; services/controllers não exportam tipo, só função e classe de erro (exceto erro que outro módulo precisa checar com `instanceof` — aí o **service dono** o exporta).

```ts
// modules/pericia/pericia.schema.ts
export type { CreatePericia, UpdatePericia };
export { createPericiaSchema, updatePericiaSchema }; // re-export de @ethica/contracts

export const periciaIdParamSchema = z.object({ id: idSchema }).strict();
// Paginação validada na borda (default/min/max no schema), nunca clamp silencioso no service.
export const listPericiasQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1) /* … */ }).strict();

export type PericiaRecord = { id: string; numeroProcesso: string /* … */ };
```

Todo schema Zod local novo entra em `modules/schema.registry.ts` (`apiSchemaRegistry`) — sem isso, `tests/structural/schema-registry.structural.test.ts` falha (AD-010: nenhum schema pode ficar fora do registry, que também garante que nenhum deles aceita chave de tenant — `TENANT_FORBIDDEN_KEYS`). O registry de `@ethica/contracts` cobre os schemas compartilhados com `apps/web`; `apiSchemaRegistry` cobre os locais do `api`. O teste estrutural varre `apps/`+`packages/` e valida a união dos dois.

Query com paginação/filtro usa `validParsedQuery(schema)` (`middlewares/validation.middleware.ts`), não `validQuery`: no Express 5 `req.query` é um getter sem cache, então `Object.assign` (o que `validQuery` faz) se perde antes do controller ler de novo — `validParsedQuery` troca `req.query` por um valor gravável de fato via
`Object.defineProperty`.

## Event bus (`src/events/`, AD-039)

Processo compartilhado entre módulos cujo **resultado a resposta HTTP não usa** vira evento — fire-and-forget. O que a resposta HTTP precisa continua chamada síncrona direta ao service do outro módulo (ex.: converter oportunidade chama `periciaService.createPericia` porque devolve o id da perícia).

```ts
// event-types.ts
export type DomainEventMap = { 'pericia:honorarios_fixados': PericiaHonorariosFixadosPayload };

// modules/pericia/pericia.service.ts — emissor não conhece o consumidor
domainEventBus.emit('pericia:honorarios_fixados', { tenantId, periciaId, numeroProcesso, valorCents });

// events/subscribers/financeiro.subscriber.ts — consumidor se registra
domainEventBus.on('pericia:honorarios_fixados', async (payload) => {
  await lancamentoService.lancarHonorariosFixados(payload);
});
```

Evento atual: `pericia:honorarios_fixados` → financeiro lança a receita a receber ou atualiza o valor do honorário fixado já lançado (AD-106, AD-111). O prazo do laudo virou o prazo "Entrega do laudo", criado no próprio `pericia.service` (AD-109), sem evento.

- Um handler que rejeita **nunca propaga** pro emissor — é capturado e logado em JSON: `{"event":"domain_event.handler_failed","name":"pericia:honorarios_fixados","message":"…"}`.
- `off(event, handler)` remove de fato (o bus guarda o wrapper por `(evento, handler)` internamente).
- `registerAllSubscribers()` (chamado no topo de `buildApp()`) é **idempotente** — `buildApp()` roda várias vezes no mesmo processo em teste, e cada handler só executa uma vez por `emit`.
- Services importam só `events/event-bus.js` — nunca `events/index.js` (que também exporta `registerAllSubscribers` e puxaria os subscribers junto, sem necessidade).
- Novo evento: adicionar o payload em `DomainEventMap`, criar `events/subscribers/<consumidor>.subscriber.ts`(`registerXSubscriber()` chamando o service dono do efeito), registrar em `events/subscribers/index.ts` e emitir do service de origem.

## Testes (AD-017)

`unit`/`integration`/`e2e`/`structural` são `projects` nomeados no `vitest.config.ts` da raiz; arquivo colocado por sufixo (`*.unit.test.ts`, `*.int.test.ts`, `*.e2e.test.ts`, `*.structural.test.ts`), sem diretório `__test__`.Teste que move de módulo junto com o arquivo que testa (`git mv`) — nunca migra pra uma pasta separada.

| Gate                           | Comando                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| Quick (só unit/structural)     | `pnpm vitest run --project unit --project structural`                |
| Full                           | `pnpm vitest run`                                                    |
| Build (sempre antes de commit) | `pnpm -r exec tsc --noEmit && pnpm biome check . && pnpm vitest run` |

**Banco de testes (AD-059, AD-065)**: `integration` e `e2e` rodam no banco `<banco>_test` derivado da `MONGODB_URI` (regra, guardas e CI em `RUN_BOOK.md#banco-de-dados`). O `globalSetup` (`packages/db/tests/setup/globalSetup.ts`) injeta a URI, provisiona os índices de busca e limpa o banco; os dois projects rodam em sequência (`sequence.groupOrder`). Teste que usa busca (`q`, `contains`) espera a indexação assíncrona com `expect.poll`; a indisponibilidade do Atlas (`503 search_unavailable`) se testa simulando o erro do driver (`vi.spyOn(Model, 'aggregate')`), nunca com regex.

`vi.mock('./x.js')` usa caminho **relativo ao arquivo de teste** — ao mover um arquivo pra outro módulo, todo `vi.mock` de repository/service próprio precisa do caminho recalculado (o TypeScript não avisa; só o teste quebra em runtime).

## Verificação (sempre, ao terminar qualquer tarefa aqui)

```bash
pnpm -r exec tsc --noEmit && pnpm biome check . && pnpm vitest run apps/api tests/structural packages/contracts
```

`tsc` pega import cross-módulo quebrado mesmo em arquivo sem teste — não pular esse passo achando que o gate de testes já cobre. Rodar `pnpm vitest run` (sem escopo) antes de abrir PR, pra pegar qualquer efeito em `apps/web`.
