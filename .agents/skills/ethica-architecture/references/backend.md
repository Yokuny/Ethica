# Back-end (`apps/api`): módulos, camada de service e eventos

Regras de código e a lista viva de módulos, donos e eventos: `apps/api/CLAUDE.md`. Aqui está o desenho e o roteiro de criação.

```
apps/api/src/
├── app.ts          # composition root: buildApp(options) monta providers, routers e o errorHandler; não abre porta
├── server.ts       # start(): conecta o banco, sincroniza índices, sobe o HTTP e os agendamentos
├── config/         # env validado com Zod no import (falha antes de aceitar tráfego), cookie
├── middlewares/    # autenticação, autorização, tenant, validação, erro, rate limit, diário de bordo
├── providers/      # serviços externos atrás de um tipo: e-mail, arquivos, PDF, APIs de terceiros
├── metrics/        # medição das operações de banco
├── events/         # bus in-process, mapa de eventos e subscribers
└── modules/
    ├── schema.registry.ts        # todo schema Zod local da API
    └── <módulo>/                 # <entidade>.router|controller|service|repository|schema.ts + testes ao lado
```

## Composition root

`buildApp(options)` é o único lugar que conhece tudo: registra os subscribers, cria cada provider (ou recebe um de teste em `options`), injeta-os nas fábricas de router e monta as rotas. Sem `.listen()`, para o teste usar `supertest` sem porta. `server.ts` é quem sobe o processo.

A camada compartilhada (`config`, `middlewares`, `providers`, `metrics`, `events`) **não importa de `modules/`**. Quando ela precisa de algo de um módulo, `app.ts` injeta (molde: o diário de bordo, `createActivityLogMiddleware(activityLogService.record)`). Única exceção: `events/subscribers/**`.

## Anatomia do módulo

Um módulo é um **contexto de domínio**, não uma entidade: agrupa as entidades que dividem dono de collection ou fronteira (`identity` tem usuário, sessão, convite e escritório). Cada entidade tem cinco arquivos. Molde completo e pequeno: `apps/api/src/modules/finance/`.

| Arquivo | Faz | Não faz |
| --- | --- | --- |
| `<entidade>.router.ts` | fábrica `createXRouter(deps)`; por rota, na ordem: `deps.validToken`, `tenantAssignmentCheck`, `can(módulo, ação)`, validação, controller | `z.object`, tipo local, regra |
| `<entidade>.controller.ts` | lê `req.tenantUser`, chama o service, responde com `respObj`; converte erro de domínio em `CustomError` com status | regra de negócio, acesso a banco |
| `<entidade>.service.ts` | regra de negócio; **única porta do módulo para os outros**; emite eventos; exporta só funções e classes de erro | importar `@ethica/db` de model que não é do módulo; tocar `req`/`res` |
| `<entidade>.repository.ts` | único que usa os models do módulo; filtro por `tenantScoped`; converte documento em `*Record` (`id` string); mede com `withDbTiming` | regra de negócio; consulta a collection de outro módulo |
| `<entidade>.schema.ts` | schemas Zod locais (params, query) com `.strict()`; re-export do que vem de `@ethica/contracts`; tipos de saída e `XRouterDeps` | lógica |

```ts
// <entidade>.router.ts
export const createXRouter = (deps: XRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck];

  router.get('/', ...guard, can('<módulo>', 'view'), validParsedQuery(listXQuerySchema), xController.list);
  router.post('/', ...guard, can('<módulo>', 'create'), validBody(createXSchema), xController.create);
  router.patch('/:id', ...guard, can('<módulo>', 'update'), validParams(xIdParamSchema), validBody(updateXSchema), xController.update);
  return router;
};
```

```ts
// <entidade>.controller.ts
const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await xService.create(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    next(e instanceof XNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
  }
};
```

```ts
// <entidade>.service.ts
export class XNotFoundError extends KeyedError {}

export const create = async (tenantId: string, data: CreateX): Promise<XRecord> => {
  if (data.caseId) await caseService.getCase(tenantId, data.caseId); // outro módulo: só pelo service
  const created = await xRepository.create(tenantId, data);
  domainEventBus.emit('x:created', { tenantId, xId: created.id });   // efeito que a resposta não usa
  return created;
};

// Função que delega, nunca alias (`export const findById = xRepository.findById`): o alias quebra o vi.mock.
export const findById = (tenantId: string, id: string) => xRepository.findById(tenantId, id);
```

```ts
// <entidade>.repository.ts
const toRecord = (doc: XDocument): XRecord => ({ id: doc._id.toString() /* … */ });

export const findById = async (tenantId: string, id: string): Promise<XRecord | null> =>
  withDbTiming('<módulo>.findById', async () => {
    const doc = await X.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });
```

```ts
// <entidade>.schema.ts
export type { CreateX, UpdateX };
export { createXSchema, updateXSchema }; // re-export de @ethica/contracts

export const xIdParamSchema = z.object({ id: idSchema }).strict();
export const listXQuerySchema = z
  .object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })
  .strict();
export type ListXQuery = z.infer<typeof listXQuerySchema>;

export type XRouterDeps = { validToken: RequestHandler };
export type XRecord = { id: string; /* … */ createdAt: Date; updatedAt: Date };
```

Erro que chega ao cliente é sempre **chave** (`KeyedError`, `CustomError` em `apps/api/src/middlewares/errorHandler.middleware.ts`); o detalhe técnico vai em `detail`, só para o log.

## Camada de service entre módulos

- De outro módulo só se importa `*.service.js` (valor) e `*.schema.js` (tipo). O dado de outro domínio chega por função do service dono.
- **Antes de importar**, olhe o grafo em `apps/api/CLAUDE.md`: ele não pode ganhar ciclo. Os módulos de núcleo não dependem de ninguém; módulo novo de domínio pode depender deles. Se o núcleo precisa causar efeito no módulo novo, é **evento**, não import.
- Enriquecimento (nome, número) é **uma consulta em lote por collection** exposta pelo dono (`caseService.findSummariesByIds`), nunca uma consulta por item. Referência ausente vira campo ausente.

## Eventos (`apps/api/src/events/`, AD-039)

| Situação | Use |
| --- | --- |
| A resposta HTTP precisa do resultado (id criado, validação que pode recusar) | chamada direta ao service do outro módulo |
| Efeito que pode falhar sem derrubar a operação (lançar receita, atualizar agenda, apagar dado ligado) | evento |
| A chamada direta criaria ciclo entre módulos | evento: o emissor não conhece o consumidor |

Custo do evento: sem garantia de entrega nem nova tentativa. Handler que falha só deixa log (`domain_event.handler_failed`).

Evento novo, na ordem:

1. `apps/api/src/events/event-types.ts`: interface do payload (sempre com `tenantId` e tudo que o consumidor precisa para agir) e a entrada em `DomainEventMap`. Nome `'<domínio>:<fato>'`, em `snake_case`.
2. `apps/api/src/events/subscribers/<consumidor>.subscriber.ts`: `registerXSubscriber()` que faz `domainEventBus.on(...)` e chama o **service** do módulo consumidor. Um arquivo por módulo consumidor.
3. `apps/api/src/events/subscribers/index.ts`: acrescente o registro em `registerAllSubscribers()` (idempotente).
4. No service de origem: `domainEventBus.emit(...)`, importando só `events/event-bus.js`.

Moldes: `apps/api/src/events/subscribers/finance.subscriber.ts` e o `emit` em `apps/api/src/modules/finance/transaction.service.ts`.

## Providers

Serviço externo fica atrás de um **tipo** e de uma fábrica `createX(config)` em `apps/api/src/providers/`. `buildApp` cria com o env e injeta pela fábrica do router (`createProspectingRouter({ validToken, datajud })`); o teste passa um falso em `options`. Variável ausente deixa o provider `undefined` e a rota responde uma chave `*_not_configured`, sem derrubar o resto do app. Provider nunca importa módulo.

## Entidade ou módulo novo, na ordem

1. **Glossário**: o termo em `docs/glossary.md` (um nome por conceito, em inglês no código).
2. **Contrato**: `packages/contracts/src/schemas/<entidade>.schema.ts` → export em `packages/contracts/src/index.ts` → entrada em `packages/contracts/src/registry.ts`.
3. **Model**: `packages/db/src/models/<entidade>.model.ts` → export e `syncIndexes()` em `packages/db/src/index.ts`.
4. **Dono**: o model na tabela `DB_OWNERSHIP` (`tests/structural/module-boundary.structural.test.ts`) e na tabela de `apps/api/CLAUDE.md`.
5. **Módulo**: `schema` → `repository` → `service` → `controller` → `router`, copiando de `apps/api/src/modules/finance/`.
6. **Registries**: schemas locais em `apps/api/src/modules/schema.registry.ts`.
7. **Rota**: `app.use('/<recurso-no-plural>', createXRouter({ validToken }))` em `apps/api/src/app.ts`.
8. **Acesso**: módulo e ações na matriz de permissões (skill `ethica-permissions`); prefixo novo no mapa de `apps/api/src/middlewares/activityLog.middleware.ts`, senão as escritas não entram no diário de bordo.
9. **Mensagens**: chave nova em `API_MESSAGE_KEYS` e no dicionário do web.
10. **Testes** ao lado: `<entidade>.service.unit.test.ts` (com `vi.mock` do repository e dos services de outros módulos) e `<entidade>.router.e2e.test.ts` (`buildApp()` + `supertest`, um 403 por ação ausente na matriz).

```bash
pnpm vitest run --project structural     # fronteiras, donos e registries
pnpm vitest run apps/api/src/modules/<módulo>
```

## Segundo back-end

Mesmo desenho: `app.ts` sem `listen`, camada compartilhada, `modules/`, `events/`. O que os dois back-ends usam igual já está nos pacotes (`contracts`, `db`); middleware repetido só vira pacote quando o segundo app existir de fato (`references/monorepo.md`).
