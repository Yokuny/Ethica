# Camada de dados (`src/query/`, `@query/`) e formulários

Referências: `apps/web/src/query/pericia.ts` (lista + detalhe + CRUD), `apps/web/src/query/lancamento.ts`
(lista + agregados para gráficos), `apps/web/src/routes/_private/prospeccao/@query/oportunidade.ts` (`@query/` local).

## Um arquivo por entidade: `query/<entidade>.ts`

```ts
export type XRecord = { id: string; /* espelho do repository do back-end; datas como string ISO */ };

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
      const res = await get<XListResult>(`/xs${qs(params)}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });

export const updateXMutation = (queryClient: QueryClient): UseMutationOptions<XRecord, Error, { id: string; data: UpdateX }> => ({
  mutationFn: async ({ id, data }) => { /* patch(...) + mesmo tratamento de res */ },
  onSuccess: (x) => {
    queryClient.invalidateQueries({ queryKey: xKeys.lists() });
    queryClient.invalidateQueries({ queryKey: xKeys.detail(x.id) });
  },
});
```

- Na tela: `useQuery(xsQuery(params))`, `useMutation(updateXMutation(useQueryClient()))`.
  Sem hooks `useX()` próprios: a factory é testável sem React.
- Procure em `src/query/` antes de criar; entidade usada por 2+ rotas permanece lá.
  Factory usada só no nível de uma rota vai em `@query/` desse nível, conforme a seção 1
  da skill. Nunca `fetch`/`get` direto num componente ou hook de formulário/search.
- Lista é sempre server-driven: página, filtro e ordenação vão nos params (AD-028).
- `res.message` já chega traduzido pelo cliente (`lib/api/client.api.ts`): use
  `throw new Error(res.message ?? t('x_error'))` e, na tela, `toast.error(error.message)`.
- Guarda de rota usa `context.queryClient.ensureQueryData(sessionQuery)` no `beforeLoad`.

## Formulário

- `react-hook-form` + `zodResolver(schema)` com schema de `@ethica/contracts` (payload) — nunca
  redefinir o schema da API no front. Schema só de search params vai em `@interface/`.
- Layout: `<DefaultFormLayout sections={[{ title, description, fields: [...] }]}>`; campos lado a
  lado são uma linha `grid` no próprio `fields`. Toda seção tem título e descrição.
- Todo input com `placeholder={t(...)}`; erro de campo via `<FormMessage/>`.
- Campos prontos em `@/components/form-fields.js` (`TextField`, `SelectField`, `MoneyField`,
  `DateField`, `TimeField`, `NumberField`, `TextareaField`) — use-os antes de montar `FormField` à mão.
- Dinheiro: `<MoneyInput>` + `money.helper`; valor de `<input>` de data/hora: `displayTime.helper`.

## Hook de formulário — `@hooks/use-x-form.ts`

Exemplo de criação com o contrato real de produto; defaults em `@consts/default-values.ts`.
O hook fica no nível de quem o usa (add sozinho → `add/@hooks/`; add e details → pai).
Preserve navegação, mensagens e guardas de submissão da tela ao extrair.

```ts
import { type CreateProduct, createProductSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createProductMutation } from '@/query/product.js';
import { DEFAULT_VALUES } from '../@consts/default-values.js';

export function useProductForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation(createProductMutation(queryClient));
  const form = useForm<CreateProduct>({
    resolver: zodResolver(createProductSchema), defaultValues: DEFAULT_VALUES,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateProduct) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data, {
      onSuccess: () => navigate({ to: '/products' }),
      onError: (error) => setErrorMessage(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
```

O componente visual usa `<Form {...form}>`, `<form noValidate onSubmit={onSubmit}>` e
`<DefaultFormLayout sections={...}>` de `@/components/default-form-layout.js`.
`isPending` controla as ações do form; loading do dado é resolvido pela página antes de montar o filho.
