# Moldes de página

Cada molde aponta para um arquivo real que já segue o padrão — leia-o antes de escrever.
Caminhos a partir de `apps/web/src/routes/_private/`.

## Hub de módulo — `{modulo}/index.tsx`

Referência: `financeiro/index.tsx`, `prospeccao/index.tsx`.

```tsx
// SECTIONS vem de ./@consts/sections.js (um destino por sub-rota; `icon` é LucideIcon).

export function XIndexPage() {
  return (
    <Card asPage>
      <CardHeader title={t('x')} />
      <CardContent className="flex w-full max-w-4xl flex-col gap-8 pb-24">
        <PageIntro
          title={t('x')}
          description={t('...')}
          illustration={<XIllustration />} // @components/ da rota, decorativa
          heading={t('...')}
          text={t('...')}
          features={[{ icon: List, label: t('list') } /* 3 recursos */]}
        />
        <LinkCardList>
          {SECTIONS.map(({ to, titleKey, icon }) => (
            <LinkCard key={to} render={<Link to={to} />} icon={icon} title={t(titleKey)} />
          ))}
        </LinkCardList>
      </CardContent>
    </Card>
  );
}
```

- Padrão de toda página `index` que redireciona para as páginas do módulo (AD-095). `CardHeader` leva só o título (e `CardAction`, quando há ação principal); a descrição vive no `PageIntro`, que vem antes da lista.
- `PageIntro` tem altura fixa para ficar igual em todos os hubs: texto novo precisa caber.
- Nunca `redirect()` automático para a primeira sub-rota.
- Destino só de admin: filtre por `isAdminSession` (ver `index.tsx` do `_private`).

## Listagem — `index.tsx` ou `list/index.tsx`

Referência: `pericias/index.tsx` (busca + filtros em popover), `financeiro/lancamentos/index.tsx` (filtros na barra + Dialog de criar/editar), `prospeccao/oportunidades/index.tsx` (abas por status).

- Schema Zod dos search params (`page`, `limit`, filtros) em `@interface/`;
  `validateSearch` no `Route`.
- Mudança de página/filtro = `navigate({ search, replace: true })`; a query refaz a chamada
  (AD-028). Busca por texto com `useDebouncedSearch`.
- Filtros no topo do `CardContent`; `CardHeader` só título + `CardAction` (criar).
- Tabela em `@components/x-table.tsx`, recebe dado pronto + `pageCount`/`onPaginationChange`/`onRowClick`.
- `onRowClick` → `navigate({ to: '/x/details', search: { id } })`.
- Vazio distingue `reason="filtered"` (com `onClearFilters`) de `reason="empty"`; erro com `onRetry`.

## Estados da página — loading → erro → vazio → conteúdo

O `Card` permanece montado em todos os estados. `CardHeader` contém só título/descrição
e `CardAction`; filtros abrem o `CardContent`. A página exporta `function XPage`, usa
`useSearch({ strict: false })` quando lê search e define `staticData.title` e `validateSearch`
com schema de `@interface/` no `Route`.

```tsx
return (
  <Card asPage>
    <CardHeader title={t('products')}>
      <CardAction>{/* ação primária */}</CardAction>
    </CardHeader>
    <CardContent>
      {/* filtros; clearFilters vem do hook de search */}
      {query.isLoading ? (
        <DefaultLoading />
      ) : query.isError ? (
        <DefaultEmptyData reason="error" onRetry={() => void query.refetch()} />
      ) : !items.length ? (
        hasFilters ? (
          <DefaultEmptyData reason="filtered" onClearFilters={clearFilters} />
        ) : (
          <DefaultEmptyData reason="empty" />
        )
      ) : (
        <ProductsTable data={items} {...tableProps} />
      )}
    </CardContent>
  </Card>
);
```

Detalhe usa ausência do registro como vazio; não confunda erro da consulta com registro
ausente. Hub ou criação sem consulta não inventam estado de loading/erro/vazio.
Nenhum early-return antes do `Card`; early-return só em componente comum. O filho recebe
dados prontos, nunca `isLoading` por prop.

## Detalhe — `details/index.tsx`

Referência: `pericias/details/index.tsx`.

- `search: { id }` validado por `z.object({ id: z.string().min(1) })`.
- Somente-leitura por padrão (`XDetailsView` com `RecordHeader`/`RecordStats`/`ProductSpecs`).
  `Editar` no `CardAction` troca para `XEditForm` com `Salvar` + `Cancelar`. Nunca form
  sempre-editável.
- Erro de exclusão via `toast.error(error.message)`.
- Registro não encontrado → `DefaultEmptyData` dentro do `Card`, nunca tela em branco.
- Tela-canvas sem "detalhe" de página inteira (ex.: `agenda/`): criar/editar abre `FormDialog` (AD-070).

## Criação — `add/index.tsx`

Referência: `pericias/add/index.tsx`.

- `useForm<CreateX>({ resolver: zodResolver(createXSchema), defaultValues })` com schema de `@ethica/contracts`.
- `<Form {...form}><form noValidate onSubmit={form.handleSubmit(onSubmit)}><DefaultFormLayout sections={[...]} /></form></Form>`
  — cada seção com título + descrição; `<Panel render={<form/>}>` quando o form é um bloco dentro de outra página.
- `useMutation(createXMutation(queryClient))`; `onSuccess` navega para a listagem (ou detalhe).
- Form compartilhado com o `details` → componente em `{modulo}/@components/` (ex.:
  `pericias/@components/pericia-form-fields.tsx`, usado por `add` e pela edição em `details`).

## Dialog ou página `/add` (AD-070)

Criar/editar/agir sobre registro abre `Dialog` (`@ethica/ui/components/dialog`) ou navega para uma
página `/add` com `<DefaultFormLayout>`; a escolha é caso a caso, com o usuário. Moldes:
`pericias/add/` (página), `agenda/@components/compromisso-form.tsx` e
`financeiro/lancamentos/@components/lancamento-form.tsx` (`FormDialog`).

## Teste de página

Página é exportada e lê o search com `useSearch({ strict: false })` para renderizar sem
`RouterProvider`. Mock mínimo:

```tsx
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    useMatches: () => [],
    useRouter: () => ({ history: { back: vi.fn() } }),
    Link: ({ to, children }) => <a href={to}>{children}</a>, // só se a página usa <Link>
  };
});
```
