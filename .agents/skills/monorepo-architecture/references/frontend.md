# Front-end (`apps/web`): camada global e rotas

```
apps/web/src/
├── main.tsx          # providers montados uma vez: QueryClient, router, toaster
├── router.tsx        # queryClient + router (o queryClient vai no contexto do router)
├── routeTree.gen.ts  # gerado pelo plugin do TanStack Router; nunca editar
├── index.css         # Tailwind + tema do app + `@source` apontando para packages/ui
├── components/       # ┐
├── hooks/            # │ camada global: o que 2+ módulos usam
├── lib/              # │
├── query/            # ┘
└── routes/           # páginas por arquivo; cada nível com suas pastas @ locais
```

## Entrada do app

```ts
// vite.config.ts
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePrefix: '@', // @components, @hooks… are not routes
      routeFileIgnorePattern: '\\.unit\\.test\\.tsx?$', // tests sit next to the route file
    }),
    react(), // after the router plugin, which rewrites the route files first
    tailwindcss(),
  ],
  envDir: '../../', // the single .env at the monorepo root
  // The port must match the API CORS origin. strictPort makes the dev server fail loudly when the port is
  // taken, instead of silently moving to the next one and dying with a CORS error on every call.
  server: { port: 15173, strictPort: true },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
```

```tsx
// src/router.tsx
import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.js';

export const queryClient = new QueryClient();

// The queryClient goes into the router context so a route guard can read the session query.
export const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

```tsx
// src/routes/__root.tsx
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({ component: () => <Outlet /> });
```

```tsx
// src/main.tsx
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
```

```css
/* src/index.css */
@import "tailwindcss";
@import "./theme.css";                 /* tokens de marca do app */
@source "../../../packages/ui/src";    /* o Tailwind gera as classes usadas no pacote de UI */
```

Todo import relativo ou por `@/` leva `.js`, mesmo apontando para `.tsx` (`NodeNext`). Antes de subir a versão maior do Vite, confirme que o resolver dela aceita esse import; se não aceitar, fixe a versão no `overrides` do `pnpm-workspace.yaml`.

## Camada global

| Pasta | Entra | Nome de arquivo |
| --- | --- | --- |
| `components/` | composição de primitivos que conhece rota, sessão, tradução ou domínio; os componentes padrão de página; mapas de rótulo do domínio (valor do enum → texto) | `kebab-case.tsx`, `<entidade>-labels.ts` |
| `hooks/` | comportamento de tela reaproveitado por 2+ módulos | `useX.ts` |
| `lib/api/` | o cliente HTTP: único lugar com `fetch` | `client.api.ts` |
| `lib/helpers/` | função pura com teste ao lado: textos (`t`), datas, dinheiro | `<nome>.helper.ts` |
| `query/` | um arquivo por entidade usada por 2+ rotas; a sessão | `<entidade>.ts`, `session.ts` |

Componentes padrão que a camada global oferece, para nenhuma página montar o seu: container de página com título e ações (`page-card`), carregando (`default-loading`), vazio e erro (`default-empty-data`), moldura de tabela com busca e filtros (`data-table`), paginação (`table-pagination`), layout de formulário (`default-form-layout`), campos prontos (`form-fields`), diálogo de formulário (`form-dialog`) e de confirmação (`confirm-dialog`).

Antes de criar qualquer coisa na camada global, **procure**: componente parecido, chave de texto, hook, factory de query. O que existe é estendido, não duplicado.

```ts
// src/lib/helpers/translate.helper.ts — a fixed dictionary; every visible string goes through t(key)
const translations: Record<string, string> = {
  not_found: 'Não encontrado',
  invalid_session: 'Sessão inválida',
  connection_error: 'Não foi possível conectar ao servidor',
  load_error: 'Não foi possível carregar',
  // …includes every key of API_MESSAGE_KEYS; a unit test fails when one is missing
};

export const t = (key: string): string => translations[key] ?? key;
```

```ts
// src/lib/api/client.api.ts
import type { ApiResponse } from '@scope/contracts';
import { t } from '../helpers/translate.helper.js';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

// The API `message` is a translation KEY: translated here, at the single entry point of the responses,
// so no screen calls t() on `res.message` again.
const translateMessage = <T>(body: ApiResponse<T>): ApiResponse<T> =>
  body.message ? { ...body, message: t(body.message) } : body;

// Never throws: a network failure becomes an ApiResponse with success:false.
// The only credential is the httpOnly session cookie, attached by the browser.
export const request = async <T>(path: string, method: Method, body?: unknown): Promise<ApiResponse<T>> => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return translateMessage((await res.json()) as ApiResponse<T>);
  } catch {
    return { success: false, message: t('connection_error') };
  }
};

export const get = <T>(path: string): Promise<ApiResponse<T>> => request<T>(path, 'GET');
export const post = <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => request<T>(path, 'POST', body);
export const patch = <T>(path: string, body?: unknown): Promise<ApiResponse<T>> => request<T>(path, 'PATCH', body);
export const del = <T>(path: string): Promise<ApiResponse<T>> => request<T>(path, 'DELETE');
```

## Camada de dados (`query/` e `@query/`)

```ts
// src/query/<entidade>.ts
import type { CreateX, UpdateX } from '@scope/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api/client.api.js';
import { t } from '../lib/helpers/translate.helper.js';

// Mirrors the record type of the API module; dates arrive as ISO strings.
export type XRecord = { id: string; name: string; status: string; otherId?: string };
export type XQueryParams = { page?: number; limit?: number };
export type XListResult = { items: XRecord[]; total: number };

export const xKeys = {
  all: ['x'] as const,
  lists: () => [...xKeys.all, 'list'] as const,
  list: (params: XQueryParams) => [...xKeys.lists(), params] as const,
  details: () => [...xKeys.all, 'detail'] as const,
  detail: (id: string) => [...xKeys.details(), id] as const,
};

export const xsQuery = (params: XQueryParams = {}) =>
  queryOptions({
    queryKey: xKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams(
        Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
      );
      const qs = search.toString();
      const res = await get<XListResult>(`/xs${qs ? `?${qs}` : ''}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const createXMutation = (queryClient: QueryClient): UseMutationOptions<XRecord, Error, CreateX> => ({
  mutationFn: async (data) => {
    const res = await post<XRecord>('/xs', data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('create_error'));
    return res.data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: xKeys.lists() }),
});

export const updateXMutation = (
  queryClient: QueryClient,
): UseMutationOptions<XRecord, Error, { id: string; data: UpdateX }> => ({
  mutationFn: async ({ id, data }) => {
    const res = await patch<XRecord>(`/xs/${encodeURIComponent(id)}`, data);
    if (!res.success || !res.data) throw new Error(res.message ?? t('save_error'));
    return res.data;
  },
  onSuccess: (x) => {
    queryClient.invalidateQueries({ queryKey: xKeys.lists() });
    queryClient.invalidateQueries({ queryKey: xKeys.detail(x.id) });
  },
});
```

- Na tela: `useQuery(xsQuery(params))` e `useMutation(updateXMutation(useQueryClient()))`. Sem hooks `useX()` de busca: a factory é testável sem React.
- Nunca `fetch` ou `get` direto num componente ou hook.
- Lista é sempre do servidor: página, filtro e ordenação vão nos params e vivem na URL.
- `res.message` já chega traduzido: `throw new Error(res.message ?? t('x_error'))` e, na tela, `toast.error(error.message)`.
- Sem store global: TanStack Query é a única fonte de dado de servidor.

A sessão também é uma query, lida pela guarda de rota:

```ts
// src/query/session.ts
export type SessionView = { tenant?: { id: string; name: string }; user: { id: string; name: string }; role: string[] };

export const sessionQuery = queryOptions({
  queryKey: ['session', 'detail'] as const,
  queryFn: async (): Promise<SessionView> => {
    const res = await get<SessionView>('/auth/session');
    if (!res.success || !res.data) throw new Error(res.message ?? t('invalid_session'));
    return res.data;
  },
  staleTime: 60_000, // the guard runs on every private navigation
  retry: false, // an invalid session fails once and redirects once
});

export const isAdminSession = (session: SessionView): boolean => session.role.includes('admin');
```

```tsx
// src/routes/_private/route.tsx — layout pathless: session guard + app shell
export const Route = createFileRoute('/_private')({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(sessionQuery);
    } catch {
      throw redirect({ to: '/auth' });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
```

O web repete a regra de acesso só para não mostrar o que a API vai recusar. A API é quem decide.

## Rotas

**Toda rota é uma pasta com `index.tsx`.** Nenhum arquivo de rota fica ao lado de uma pasta homônima.

```
src/routes/
├── __root.tsx
├── _public/route.tsx               # layout pathless visual (entrada, convite)
└── _private/
    ├── route.tsx                   # layout pathless: guarda de sessão + casca do app
    ├── index.tsx                   # início
    ├── _admin/
    │   ├── route.tsx               # guarda de papel → redirect('/')
    │   └── <módulo>/...            # telas só de admin (o prefixo não entra na URL)
    └── <módulo>/
        ├── index.tsx               # a página principal, ou o hub quando há 2+ destinos
        ├── list/index.tsx          # listagem, quando index.tsx é hub
        ├── add/index.tsx           # criação
        ├── details/                # ver e editar (?id=)
        │   ├── index.tsx
        │   └── @components/        # só do details
        ├── @components/            # do index.tsx OU compartilhado por 2+ filhos
        ├── @consts/                # valores fixos: defaults, limites, opções
        ├── @hooks/                 # use-x-form.ts, use-x-search.ts: orquestração local
        ├── @interface/             # schema Zod dos search params, tipos locais
        ├── @query/                 # factories de dados locais
        └── @utils/                 # funções puras, colunas de tabela
```

- Sem `.` no nome do arquivo, sem `$id` dinâmico: registro é identificado por search param (`details/?id=`), validado com schema Zod em `validateSearch`.
- Layout é `route.tsx` dentro da pasta pathless (`_nome/`). `beforeLoad` + `redirect()` só para guarda binária (tem sessão, é admin).
- Pastas `@` pertencem à rota do mesmo nível e são ignoradas pelo scanner de rotas. Crie cada uma só quando houver conteúdo.
- `index.tsx` compõe a tela; o resto sai para as pastas `@`.
- Teste ao lado do arquivo testado. `routeTree.gen.ts` é regenerado pelo dev server ou pelo build.

```tsx
// src/routes/_private/<módulo>/index.tsx
export function XPage() {
  // exported: the test renders it without a real router
  const search = useSearch({ strict: false }) as XSearch;
  const query = useQuery(xsQuery(search));

  return (
    <PageCard title={t('x')}>
      {/* the page container is ALWAYS mounted: loading, error and empty are resolved inside it */}
      {query.isLoading ? (
        <DefaultLoading />
      ) : query.isError ? (
        <DefaultEmptyData reason="error" onRetry={() => query.refetch()} />
      ) : !query.data.items.length ? (
        <DefaultEmptyData reason="empty" />
      ) : (
        <XTable data={query.data.items} />
      )}
    </PageCard>
  );
}

export const Route = createFileRoute('/_private/<módulo>/')({
  component: XPage,
  validateSearch: (search: Record<string, unknown>): XSearch => xSearchSchema.parse(search),
});
```

Quem busca o dado decide carregando, vazio e erro; o filho recebe o dado pronto, nunca `isLoading` por prop.

## Formulário

Schema do payload vem de `@scope/contracts`, nunca é redefinido no front. O hook reúne formulário, mutation e envio:

```ts
// @hooks/use-x-form.ts
export function useXForm() {
  const navigate = useNavigate();
  const mutation = useMutation(createXMutation(useQueryClient()));
  const form = useForm<CreateX>({ resolver: zodResolver(createXSchema), defaultValues: DEFAULT_VALUES });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateX) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data, {
      onSuccess: () => navigate({ to: '/<módulo>' }),
      onError: (error) => setErrorMessage(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
```

## Escada de promoção

O código nasce no degrau mais baixo e sobe só com o segundo consumidor:

```
@components / @hooks / @utils / @query da rota          usado por uma rota
        ↓ segundo consumidor é rota irmã
@ do pai (ancestral comum)                              ex.: formulário de add e de details
        ↓ segundo consumidor é outro módulo
src/components · src/hooks · src/lib · src/query        camada global do app
        ↓ segundo consumidor é outro app
packages/ui (primitivo visual) · packages/contracts (schema, enum, regra pura)
```

Módulo de `routes/` nunca importa de outro módulo de `routes/`: se precisou, o código sobe. Ao subir, **mova** o arquivo (com o teste) e apague o antigo; não deixe re-export no lugar. Se o segundo consumidor some, o arquivo desce.

Primitivo × composição: sem regra de negócio, sem rota e sem sessão é primitivo (`packages/ui`); se conhece qualquer um desses, é do app (`src/components`). Existe wrapper do app para o primitivo? Use o wrapper.

## Caminho do dado

```
packages/contracts (schema do payload)
        ↓
lib/api/client.api.ts (get/post/patch/del → envelope da resposta, mensagem traduzida)
        ↓
query/<entidade>.ts ou @query/ (queryOptions e mutations)
        ↓
index.tsx da rota (useQuery, decide carregando/vazio/erro)
        ↓
@components (recebem o dado pronto)
```

## React

- Componente é `function` declarada; ordem interna: router e contexto → queries e mutations → estado local → derivados (`useMemo`) → handlers → effects (raros) → render.
- Sem `fetch` em `useEffect`, sem `useEffect` para estado derivado.
- Nunca exibir id cru: mostre o nome e ligue para o detalhe.

## Módulo de tela novo, na ordem

1. A API do módulo existe e o contrato está em `@scope/contracts` (`references/backend.md`).
2. `src/query/<entidade>.ts` (ou `@query/` se só uma rota usa): tipos espelhados, keys, queries e mutations.
3. `src/routes/_private/<módulo>/index.tsx`: a página principal ou o hub; depois `list/`, `add/`, `details/` conforme o caso.
4. Entrada na navegação do app, com a mesma regra de acesso da API.
5. Textos novos no dicionário, reaproveitando as chaves genéricas.
6. Teste ao lado da página; `pnpm run check` e `(cd apps/web && pnpm run build)`. O build é o único passo que empacota o app: pega import quebrado que o `tsc` não pega.
