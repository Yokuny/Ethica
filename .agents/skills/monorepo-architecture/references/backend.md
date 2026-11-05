# Back-end (`apps/api`): módulos, camada de service e eventos

```
apps/api/src/
├── app.ts          # montagem: buildApp(options) cria providers, monta routers e o errorHandler; não abre porta
├── server.ts       # start(): conecta o banco, sincroniza índices e sobe o HTTP
├── config/         # env validado com Zod no import
├── middlewares/    # autenticação, autorização, tenant, validação, erro
├── providers/      # serviços externos atrás de um tipo: e-mail, arquivos, APIs de terceiros
├── metrics/        # medição (opcional; nasce quando houver o que medir)
├── events/         # bus in-process, mapa de eventos e subscribers (nasce com o primeiro evento)
└── modules/
    ├── schema.registry.ts        # todo schema Zod local da API
    └── <módulo>/                 # <entidade>.router|controller|service|repository|schema.ts + testes ao lado
```

Duas regras de dependência sustentam tudo:

1. A camada compartilhada (`config`, `middlewares`, `providers`, `metrics`, `events`) **não importa de `modules/`**. Quando ela precisa de algo de um módulo, `app.ts` injeta. Única exceção: `events/subscribers/**`.
2. Um módulo só importa de outro o `*.service.js` (valor) e o `*.schema.js` (tipo).

## Montagem

```ts
// src/app.ts
import { respObj } from '@scope/contracts';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.config.js';
import { registerAllSubscribers } from './events/index.js';
import { createAuthMiddleware } from './middlewares/authentication.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { buildAuthDeps } from './modules/identity/auth.deps.js';
import { createAuthRouter } from './modules/identity/auth.router.js';
import { createXRouter } from './modules/<módulo>/<entidade>.router.js';
import { createLogMailProvider, type MailProvider } from './providers/mail.js';

// No .listen(): tests drive the app through supertest without opening a port.
// Providers are injectable so a test can pass a fake.
export const buildApp = (options: { mail?: MailProvider } = {}): Express => {
  registerAllSubscribers(); // idempotent: buildApp() runs many times in the same test process

  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  const { validToken } = createAuthMiddleware(buildAuthDeps());
  const mail = options.mail ?? createLogMailProvider();

  app.get('/health', (_req, res) => {
    res.json(respObj({ data: { service: 'api' } }));
  });

  app.use('/auth', createAuthRouter({ validToken, mail }));
  app.use('/<recurso-no-plural>', createXRouter({ validToken }));

  app.use(errorHandler); // always last
  return app;
};
```

```ts
// src/server.ts
import { pathToFileURL } from 'node:url';
import { connect, syncIndexes } from '@scope/db';
import { buildApp } from './app.js';
import { env } from './config/env.config.js';

// env → connect → indexes → listen. A database that is down never leaves the process up accepting traffic.
export const start = async (opts: { port?: number } = {}) => {
  try {
    await connect(env.MONGODB_URI);
    await syncIndexes();
    const port = opts.port ?? Number(env.API_PORT);
    const httpServer = buildApp().listen(port, () => {
      console.log(JSON.stringify({ event: 'server.listening', port }));
    });
    return { httpServer };
  } catch (e) {
    console.error(JSON.stringify({ event: 'server.boot_failed', message: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  }
};

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) void start();
```

Log é sempre uma linha JSON com `event` (`server.listening`, `request.error`, `domain_event.handler_failed`).

## Camada compartilhada

```ts
// src/config/env.config.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1),
  API_PORT: z.string().min(1),
  SESSION_JWT_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
});
export type Env = z.infer<typeof envSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Missing or invalid environment variable(s): ${missing.join(', ')}`);
  }
  return result.data;
};

// Validated on import: a failure brings the boot down before any traffic is accepted.
export const env = parseEnv(process.env);
```

```ts
// src/middlewares/errorHandler.middleware.ts
import crypto from 'node:crypto';
import { type ApiMessageKey, badRespObj, isApiMessageKey } from '@scope/contracts';
import type { NextFunction, Request, Response } from 'express';

// Every error that reaches the client carries a translation KEY of the contract in `message`.
// The technical text (invalid field, id) goes in `detail`, which only the log shows.
export class KeyedError extends Error {
  declare message: ApiMessageKey;
  readonly detail?: string;

  constructor(message: ApiMessageKey, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

// Keyed error with an HTTP status, used by the middleware chain and by controllers.
export class CustomError extends KeyedError {
  status: number;

  constructor(message: ApiMessageKey, status: number, detail?: string) {
    super(message, detail);
    this.status = status;
  }
}

const hasStatus = (err: unknown): err is { status: number } =>
  typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number';

// The error's own key when it is one, `invalid_data` for a keyless 4xx (malformed JSON), `internal_error` for any 5xx.
const resolveMessageKey = (err: unknown, status: number): ApiMessageKey => {
  if (status >= 500) return 'internal_error';
  if (err instanceof Error && isApiMessageKey(err.message)) return err.message;
  return 'invalid_data';
};

// Never exposes stack or raw text in the body: only in the structured log, with a requestId.
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const status = hasStatus(err) ? err.status : 500;
  const requestId = (req.headers?.['x-request-id'] as string | undefined) ?? crypto.randomUUID();

  console.error(
    JSON.stringify({
      event: 'request.error',
      requestId,
      status,
      message: err instanceof Error ? err.message : String(err),
      detail: err instanceof KeyedError ? err.detail : undefined,
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  res.status(status).json(badRespObj({ message: resolveMessageKey(err, status) }));
};
```

```ts
// src/middlewares/validation.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import { CustomError } from './errorHandler.middleware.js';

// The client only gets `invalid_data`; the per-field detail goes to the log.
export const invalidDataError = (error: ZodError, target: string): CustomError =>
  new CustomError(
    'invalid_data',
    400,
    error.issues.map((issue) => `${issue.path.join('.') || target}: ${issue.message}`).join('; '),
  );

const validate = (schema: ZodType, target: 'body' | 'params') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(invalidDataError(result.error, target));
      return;
    }
    if (target === 'body' && req.body === undefined) req.body = {};
    Object.assign(req[target] as object, result.data); // keeps the schema transformations
    next();
  };
};

export const validBody = (schema: ZodType) => validate(schema, 'body');
export const validParams = (schema: ZodType) => validate(schema, 'params');

// In Express 5 `req.query` is a getter without cache: assigning into it is lost. Here it is replaced by
// the parse result, with the schema coercion and defaults.
export const validParsedQuery = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(invalidDataError(result.error, 'query'));
      return;
    }
    Object.defineProperty(req, 'query', { value: result.data, configurable: true, enumerable: true, writable: true });
    next();
  };
};
```

```ts
// src/middlewares/authentication.middleware.ts
import crypto from 'node:crypto';
import type { Role, TenantUser } from '@scope/contracts';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { CustomError } from './errorHandler.middleware.js';

declare global {
  namespace Express {
    interface Request {
      tenantUser: TenantUser; // built from the DATABASE on every request, never from the token payload
    }
  }
}

// Injected: the shared layer does not import modules. The real implementation over the db package lives in
// modules/identity/auth.deps.ts and is passed in by app.ts.
export type AuthDeps = {
  findSessionByHash: (tokenHash: string) => Promise<{ user: string } | null>;
  getUserById: (userId: string) => Promise<{ id: string; tenant?: string; role: Role[]; active: boolean } | null>;
};

// Outside the Express pipeline so another entry point (e.g. a WebSocket handshake) reuses it.
export const authenticateSession = async (token: string | undefined, deps: AuthDeps): Promise<TenantUser> => {
  if (!token) throw new CustomError('invalid_session', 401);
  try {
    jwt.verify(token, env.SESSION_JWT_SECRET);
  } catch {
    throw new CustomError('invalid_session', 401, 'invalid or expired token');
  }

  // The session lives in the database (only the token hash is stored): revoking it takes effect on the next request.
  const session = await deps.findSessionByHash(crypto.createHash('sha256').update(token).digest('hex'));
  const user = session ? await deps.getUserById(session.user) : null;
  if (!user?.active) throw new CustomError('invalid_session', 401);

  return { tenant: user.tenant, user: user.id, role: user.role };
};

export const createAuthMiddleware = (deps: AuthDeps) => {
  const validToken = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.tenantUser = await authenticateSession(req.cookies?.session, deps); // httpOnly cookie
      next();
    } catch (e) {
      next(e);
    }
  };
  return { validToken };
};
```

```ts
// src/middlewares/tenantAssign.middleware.ts
export const tenantAssignmentCheck = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.tenantUser?.tenant) {
    next(new CustomError('company_link_required', 424));
    return;
  }
  next();
};

// src/middlewares/authorization.middleware.ts — only reads req.tenantUser; decides before any data is touched
export const checkRole = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!(req.tenantUser?.role ?? []).some((role) => allowedRoles.includes(role))) {
      next(new CustomError('no_permission', 403));
      return;
    }
    next();
  };
};
```

Permissão mais fina que papel (por módulo e ação, por dono do registro) ocupa esse mesmo lugar na cadeia; regra que depende do registro vai no service.

## Anatomia do módulo

Um módulo é um **contexto de domínio**, não uma entidade: agrupa as entidades que dividem dono de collection ou fronteira (um módulo `identity` reúne usuário, sessão, tenant e convite). Cada entidade tem cinco arquivos.

| Arquivo | Faz | Não faz |
| --- | --- | --- |
| `<entidade>.router.ts` | fábrica `createXRouter(deps)`; por rota, na ordem: autenticação, tenant, autorização, validação, controller | `z.object`, tipo local, regra |
| `<entidade>.controller.ts` | lê `req.tenantUser`, chama o service, responde com `respObj`; converte erro de domínio em `CustomError` com status | regra de negócio, acesso a banco |
| `<entidade>.service.ts` | regra de negócio; **única porta do módulo para os outros**; emite eventos; exporta só funções e classes de erro | importar model que não é do módulo; tocar `req` ou `res` |
| `<entidade>.repository.ts` | único que usa os models do módulo; filtro por `tenantScoped`; converte documento em `*Record` (`id` string) | regra de negócio; consulta a collection de outro módulo |
| `<entidade>.schema.ts` | schemas Zod locais (params, query) com `.strict()`; re-export do que vem de `@scope/contracts`; tipos de saída e `XRouterDeps` | lógica |

```ts
// <entidade>.schema.ts
import type { CreateX, UpdateX } from '@scope/contracts';
import { createXSchema, idSchema, updateXSchema } from '@scope/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CreateX, UpdateX };
export { createXSchema, updateXSchema };

export const xIdParamSchema = z.object({ id: idSchema }).strict();

// Pagination validated at the edge (default/min/max in the schema), never a silent clamp in the service.
export const listXQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListXQuery = z.infer<typeof listXQuerySchema>;

export type XRouterDeps = { validToken: RequestHandler };

export type XRecord = { id: string; name: string; status: string; otherId?: string; createdAt: Date; updatedAt: Date };
export type XListResult = { items: XRecord[]; total: number };
```

```ts
// <entidade>.repository.ts
import type { XDocument } from '@scope/db';
import { tenantScoped, X } from '@scope/db';
import type { CreateX, ListXQuery, XListResult, XRecord } from './x.schema.js';

// The repository is where the document shape (`_id`, `Other`) becomes the record shape (`id`, `otherId`).
const toRecord = (doc: XDocument): XRecord => ({
  id: doc._id.toString(),
  name: doc.name,
  status: doc.status,
  otherId: doc.Other?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const create = async (tenantId: string, { otherId, ...data }: CreateX): Promise<XRecord> =>
  toRecord(await X.create({ Tenant: tenantId, ...data, Other: otherId }));

export const findById = async (tenantId: string, id: string): Promise<XRecord | null> => {
  const doc = await X.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
  return doc ? toRecord(doc) : null;
};

export const list = async (tenantId: string, { page, limit }: ListXQuery): Promise<XListResult> => {
  const filter = tenantScoped({ Tenant: tenantId });
  const [docs, total] = await Promise.all([
    X.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    X.countDocuments(filter),
  ]);
  return { items: docs.map(toRecord), total };
};
```

```ts
// <entidade>.service.ts
import { domainEventBus } from '../../events/event-bus.js';
import { KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as otherService from '../<outro-módulo>/other.service.js';
import * as xRepository from './x.repository.js';
import type { CreateX, ListXQuery, XRecord } from './x.schema.js';

export class XNotFoundError extends KeyedError {}

export const create = async (tenantId: string, data: CreateX): Promise<XRecord> => {
  if (data.otherId) await otherService.getOther(tenantId, data.otherId); // another module: only through its service
  const created = await xRepository.create(tenantId, data);
  domainEventBus.emit('x:created', { tenantId, xId: created.id });    // side effect the response does not use
  return created;
};

export const getX = async (tenantId: string, id: string): Promise<XRecord> => {
  const found = await xRepository.findById(tenantId, id);
  if (!found) throw new XNotFoundError('not_found');
  return found;
};

// A function that delegates, never an alias (`export const list = xRepository.list`): the alias is evaluated
// on import and breaks vi.mock of the repository in tests.
export const list = (tenantId: string, query: ListXQuery) => xRepository.list(tenantId, query);
```

```ts
// <entidade>.controller.ts
import { respObj } from '@scope/contracts';
import type { NextFunction, Request, Response } from 'express';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { ListXQuery } from './x.schema.js';
import * as xService from './x.service.js';
import { XNotFoundError } from './x.service.js';

const tenantOf = (req: Request): string => req.tenantUser.tenant as string;

const notFoundAs404 = (e: unknown, next: NextFunction): void => {
  next(e instanceof XNotFoundError ? new CustomError(e.message, 404, e.detail) : e);
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await xService.create(tenantOf(req), req.body);
    res.status(201).json(respObj({ data: result, message: 'created_successfully' }));
  } catch (e) {
    notFoundAs404(e, next);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(respObj({ data: await xService.list(tenantOf(req), req.query as unknown as ListXQuery) }));
  } catch (e) {
    next(e);
  }
};

// `update` and `remove` follow the same shape: params from req.params.id, 404 through notFoundAs404,
// `removed_successfully` as the message of a delete.
```

```ts
// <entidade>.router.ts
import { Router } from 'express';
import { checkRole } from '../../middlewares/authorization.middleware.js';
import { tenantAssignmentCheck } from '../../middlewares/tenantAssign.middleware.js';
import { validBody, validParams, validParsedQuery } from '../../middlewares/validation.middleware.js';
import * as xController from './x.controller.js';
import type { XRouterDeps } from './x.schema.js';
import { createXSchema, listXQuerySchema, updateXSchema, xIdParamSchema } from './x.schema.js';

export const createXRouter = (deps: XRouterDeps): Router => {
  const router = Router();
  const guard = [deps.validToken, tenantAssignmentCheck, checkRole(['admin', 'member'])];

  router.get('/', ...guard, validParsedQuery(listXQuerySchema), xController.list);
  router.post('/', ...guard, validBody(createXSchema), xController.create);
  router.patch('/:id', ...guard, validParams(xIdParamSchema), validBody(updateXSchema), xController.update);
  router.delete('/:id', ...guard, validParams(xIdParamSchema), xController.remove);
  return router;
};
```

```ts
// src/modules/schema.registry.ts — every local Zod schema of the app; the structural test fails on one left out
import type { ZodType } from 'zod';
import { listXQuerySchema, xIdParamSchema } from './<módulo>/x.schema.js';

export const apiSchemaRegistry: ReadonlyArray<{ name: string; schema: ZodType }> = [
  { name: 'xIdParamSchema', schema: xIdParamSchema },
  { name: 'listXQuerySchema', schema: listXQuerySchema },
];
```

Nome de arquivo: `<entidade>.<camada>.ts`, entidade em `kebab-case` (`order-item.service.ts`). Rota: recurso no plural, em `kebab-case`.

## Camada de service entre módulos

- O dado de outro domínio chega por função exposta pelo service dono, nunca por repository ou model dele.
- **O grafo entre módulos não tem ciclo.** Módulos de núcleo não dependem de ninguém; módulo novo pode depender deles. Se o núcleo precisa causar efeito no módulo novo, é **evento**, não import.
- Enriquecimento (nome, número de outro cadastro) é **uma consulta em lote por collection**, exposta pelo dono (`otherService.findSummariesByIds(tenantId, ids)` devolvendo um `Map`), nunca uma consulta por item num laço. Referência ausente vira campo ausente, não `null`.
- Erro que outro módulo precisa reconhecer (`instanceof`) é exportado pelo **service dono**.

## Eventos (`src/events/`)

| Situação | Use |
| --- | --- |
| A resposta HTTP precisa do resultado (id criado, validação que pode recusar) | chamada direta ao service do outro módulo |
| Efeito que pode falhar sem derrubar a operação (criar registro derivado, atualizar outra visão, apagar dado ligado) | evento |
| A chamada direta criaria ciclo entre módulos | evento: o emissor não conhece o consumidor |

Custo do evento: sem garantia de entrega nem nova tentativa. Handler que falha só deixa log.

```ts
// src/events/event-types.ts
export interface XCreatedPayload {
  tenantId: string;
  xId: string;
}

export type DomainEventMap = {
  'x:created': XCreatedPayload;
};

export type DomainEventName = keyof DomainEventMap;
```

```ts
// src/events/event-bus.ts
import { EventEmitter } from 'node:events';
import type { DomainEventMap, DomainEventName } from './event-types.js';

type DomainEventHandler<T extends DomainEventName> = (payload: DomainEventMap[T]) => Promise<void>;
type Listener = (payload: unknown) => void;

// Fire-and-forget: a handler failure never reaches the emitter, it is only logged.
class DomainEventBus {
  private emitter = new EventEmitter();
  // The EventEmitter registers the wrapper, not the handler: keeping the wrapper by (event, handler)
  // is what allows `off` with the same handler passed to `on`.
  private listeners = new Map<DomainEventName, Map<unknown, Listener>>();

  emit<T extends DomainEventName>(event: T, payload: DomainEventMap[T]): void {
    this.emitter.emit(event, payload);
  }

  on<T extends DomainEventName>(event: T, handler: DomainEventHandler<T>): void {
    const listener: Listener = (payload) => {
      handler(payload as DomainEventMap[T]).catch((err: unknown) => {
        console.error(
          JSON.stringify({
            event: 'domain_event.handler_failed',
            name: event,
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      });
    };

    const byHandler = this.listeners.get(event) ?? new Map<unknown, Listener>();
    byHandler.set(handler, listener);
    this.listeners.set(event, byHandler);
    this.emitter.on(event, listener);
  }

  off<T extends DomainEventName>(event: T, handler: DomainEventHandler<T>): void {
    const listener = this.listeners.get(event)?.get(handler);
    if (!listener) return;

    this.emitter.off(event, listener);
    this.listeners.get(event)?.delete(handler);
  }

  listenerCount(event: DomainEventName): number {
    return this.emitter.listenerCount(event);
  }
}

export const domainEventBus = new DomainEventBus();
```

```ts
// src/events/subscribers/<consumidor>.subscriber.ts — one file per consuming module; it calls that module's SERVICE
import * as consumerService from '../../modules/<consumidor>/consumer.service.js';
import { domainEventBus } from '../event-bus.js';

export const registerConsumerSubscriber = (): void => {
  domainEventBus.on('x:created', async (payload) => {
    await consumerService.onXCreated(payload);
  });
};
```

```ts
// src/events/subscribers/index.ts
import { registerConsumerSubscriber } from './<consumidor>.subscriber.js';

// buildApp() runs several times in the same process (tests): registration is idempotent,
// so each handler runs only once per emit.
let registered = false;

export const registerAllSubscribers = (): void => {
  if (registered) return;
  registered = true;
  registerConsumerSubscriber();
};
```

```ts
// src/events/index.ts — for app.ts only
export { domainEventBus } from './event-bus.js';
export type { DomainEventMap, DomainEventName } from './event-types.js';
export { registerAllSubscribers } from './subscribers/index.js';
```

Evento novo, na ordem: payload e entrada em `DomainEventMap` (nome `'<domínio>:<fato>'` em `snake_case`; payload sempre com `tenantId` e tudo que o consumidor precisa para agir) → subscriber → registro em `subscribers/index.ts` → `emit` no service de origem. Services importam só `events/event-bus.js`, nunca `events/index.js`, que puxaria os subscribers junto.

## Providers

Serviço externo fica atrás de um **tipo** e de uma fábrica. `buildApp` cria com o env e injeta pela fábrica do router; o teste passa um falso em `options`. Variável ausente deixa o provider `undefined` e a rota responde uma chave `*_not_configured`, sem derrubar o resto do app. Provider nunca importa módulo.

```ts
// src/providers/mail.ts
// Never throws: a delivery failure cannot bring down the operation that triggered the e-mail.
export type MailProvider = { send: (to: string, subject: string, body: string) => Promise<{ sent: boolean }> };

// Dev/test implementation: records the send in the structured log.
export const createLogMailProvider = (): MailProvider => ({
  send: async (to, subject) => {
    console.log(JSON.stringify({ event: 'mail.log_send', to, subject }));
    return { sent: true };
  },
});
```

```ts
// in the router: the provider reaches the controller through the factory, not through an import
router.post('/', ...guard, validBody(inviteSchema), inviteController.send(deps.mail));
```

## Testes

Ao lado do arquivo, por sufixo.

```ts
// <entidade>.service.unit.test.ts — no database: repository and other modules' services are mocked
import { describe, expect, it, vi } from 'vitest';
import * as xRepository from './x.repository.js';
import { getX } from './x.service.js';

vi.mock('./x.repository.js', () => ({ findById: vi.fn(), create: vi.fn(), list: vi.fn() }));
vi.mock('../<outro-módulo>/other.service.js', () => ({ getOther: vi.fn() }));

describe('x.service', () => {
  it('throws not_found when the record is not of the tenant', async () => {
    vi.mocked(xRepository.findById).mockResolvedValue(null);
    await expect(getX('t1', 'x1')).rejects.toThrow('not_found');
  });
});
```

```ts
// <entidade>.router.e2e.test.ts — the whole pipeline over the test database
import { connect, disconnect, X } from '@scope/db';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';

const app = buildApp();

describe('POST /<recurso>', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string); // injected by the globalSetup
  });
  afterEach(async () => {
    await X.deleteMany({});
  });
  afterAll(async () => {
    await disconnect();
  });

  it('answers 401 with the contract key when there is no session', async () => {
    const res = await request(app).post('/<recurso>').send({ name: 'A' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'invalid_session' });
  });
});
```

`vi.mock('./x.js')` usa caminho relativo ao arquivo de teste: ao mover um arquivo de módulo, recalcule os caminhos (o TypeScript não avisa).

## Entidade ou módulo novo, na ordem

1. **Nome**: um termo em inglês para o conceito, o mesmo em todas as camadas.
2. **Contrato**: `packages/contracts/src/schemas/<entidade>.schema.ts` → export em `src/index.ts` → entrada em `src/registry.ts`.
3. **Model**: `packages/db/src/models/<entidade>.model.ts` → export e `syncIndexes()` em `src/index.ts`.
4. **Dono**: o model na tabela de donos de `tests/structural/module-boundary.structural.test.ts`.
5. **Módulo**: `schema` → `repository` → `service` → `controller` → `router`.
6. **Registry**: schemas locais em `src/modules/schema.registry.ts`.
7. **Rota**: `app.use('/<recurso-no-plural>', createXRouter({ validToken }))` em `src/app.ts`.
8. **Mensagens**: chave nova em `API_MESSAGE_KEYS` e no dicionário de textos do web.
9. **Testes** ao lado: unit do service e e2e do router (inclua um caso de acesso negado por papel).

```bash
pnpm vitest run --project structural            # fronteiras, donos e registries
pnpm vitest run apps/api/src/modules/<módulo>
```
