---
name: ethica-web-standards
description: Padrão único de arquitetura do front-end apps/web do Ethica — estrutura de rotas (pasta + index.tsx, details/, route.tsx de layout, pastas @components/@consts/@hooks/@interface/@query/@utils por nível), camadas de src/, esqueleto de página (Card asPage), hub de módulo, listagem, detalhe com toggle de edição, formulário, camada query/, componentes obrigatórios, i18n t(), datas e identidade visual. Use SEMPRE que for criar ou alterar código em apps/web — nova página, novo módulo, nova sub-rota, componente, formulário, query — ou entender/revisar a arquitetura do front. Trigger em "nova página", "nova tela", "novo módulo", "nova rota", "front-end", "apps/web", "componente", "padrão do front", "arquitetura do front".
---

# Padrões do apps/web

Regra única para todo o front. Código fora deste padrão é dívida: ao tocar num arquivo, alinhe-o.
Stack e verificação: `apps/web/CLAUDE.md`.

## 1. Rotas (TanStack Router por arquivo)

**Toda rota é uma pasta com `index.tsx`.** Nenhum arquivo de rota fica ao lado de uma pasta homônima.

```
src/routes/
├── __root.tsx
├── _public/route.tsx               # layout pathless visual (auth, invite, suspended)
└── _private/
    ├── route.tsx                   # layout pathless: guarda de sessão (beforeLoad) + SidebarInset + MobileDock
    ├── index.tsx                   # início
    ├── _admin/
    │   ├── route.tsx               # guarda isAdminSession → redirect('/')
    │   └── {modulo}/...            # telas só de admin (não entra na URL)
    └── {modulo}/
        ├── index.tsx               # hub (≥2 destinos) OU a própria página principal
        ├── list/index.tsx          # listagem, quando index.tsx é hub
        ├── add/index.tsx           # criação
        ├── details/                # visualizar + editar (?id=)
        │   ├── index.tsx
        │   └── @components/        # só do details
        ├── @components/            # do index.tsx OU compartilhado por 2+ filhos
        ├── @consts/                # seções do hub, defaults, limites, sentinels, mapas de ícone
        ├── @hooks/                 # use-x-form.ts, use-x-search.ts: orquestração local
        ├── @interface/             # schema Zod de search params, types locais
        ├── @query/                 # queryOptions/mutations locais; compartilhadas ficam em src/query/
        └── @utils/                 # helpers puros, colunas de tabela
```

- **Proibido** `.` no nome (`edit.$id.tsx`), `$id` dinâmico e `details.tsx`/`_admin.tsx` soltos.
  Registro identificado por search param: `details/?id=` + `validateSearch` com schema Zod.
  Breadcrumb é path-based; path dinâmico o quebra.
- **Layout pathless** = `route.tsx` dentro da pasta `_nome/`. `beforeLoad` + `redirect()` só para
  guarda binária (autenticado/admin), nunca para navegar de um hub.
- **Pastas `@`** (ignoradas pelo scanner via `routeFileIgnorePrefix: '@'`) pertencem à rota do
  mesmo nível:
  - usado por uma rota só → no `@` dela (`details/@components/`, `list/@utils/`);
  - usado por 2+ rotas irmãs (ex.: form de `add` e `details`) → no `@` do pai (ancestral comum);
  - usado por outro módulo → sobe para `src/components/` ou `src/lib/` (nunca import entre módulos de `routes/`).
- **Responsabilidades** (AD-067): `index.tsx` compõe a tela; extraia componentes visuais para
  `@components/`, valores fixos para `@consts/`, hooks de formulário/search para `@hooks/`,
  schemas de search e tipos locais para `@interface/`, factories de dados locais para
  `@query/` e funções puras (colunas, mapeamentos, cálculos) para `@utils/`.
  Crie cada pasta só quando houver conteúdo real; tamanho pequeno de arquivo não exige pasta.
- `@hooks/use-x-form.ts` reúne `useForm` + `zodResolver` + mutation + submit;
  `@hooks/use-x-search.ts` reúne `useSearch({ strict: false })` + navegação de filtros/paginação.
  Hooks orquestram factories de dados, sem substituir `queryOptions` por hooks de busca.
- **Queries compartilhadas**: entidade usada por 2+ rotas continua em `src/query/<entidade>.ts`.
  `@query/` serve apenas dados locais ao nível da rota (ou ao pai de rotas irmãs, conforme
  a regra acima); nunca mova uma query compartilhada para criar import entre módulos.
- Teste fica ao lado do arquivo testado: `details/index.unit.test.tsx`, `@components/x.unit.test.tsx`.
- **Módulo novo** começa pelo `index.tsx`. **Sub-rota nova** exige o card no hub do pai.
  Tela de admin também exige o card condicionado a admin no hub.
- `routeTree.gen.ts` é gerado; com o dev server rodando, o plugin regenera e corrige o ID do
  `createFileRoute` ao mover arquivo. Sem dev server, suba `pnpm --filter web run dev` antes de `check`/`build`.

## 2. Camadas de `src/`

| Pasta | Conteúdo |
| --- | --- |
| `routes/` | páginas + `@` locais (seção 1) |
| `components/` | componentes compartilhados entre módulos e wrappers de primitivo do app (`button`, `badge`, `checkbox`, `panel`, `page-card`, `table-pagination`, `form-fields`, `date-picker`, `fluxo-financeiro-chart`, `*-labels.ts`) |
| `query/<entidade>.ts` | chamadas à API de entidades compartilhadas por 2+ rotas: `xKeys`, `xQuery` (`queryOptions`), `xMutation(queryClient)`; factories locais em `routes/**/@query/` — ver `references/data-layer.md` |
| `hooks/` | hooks de UI reaproveitáveis (`useDebouncedSearch`, `useTextSize`) — procure antes de criar |
| `lib/api/` | cliente HTTP (`get/post/patch/del`) |
| `lib/helpers/` | `translate.helper` (`t`), `formatDate.helper`, `money.helper`, `displayTime.helper` |
| `packages/ui` (`@ethica/ui/components/*`) | primitivos shadcn/Base UI; se existe wrapper em `@/components/`, use o wrapper |

Schemas de payload vêm de `@ethica/contracts`; tipos de resposta são espelhados em `query/<entidade>.ts`.
TanStack Query é a única fonte de dados — sem Zustand/estado global; filtro e paginação vivem na URL.

## 3. Página

```tsx
export function XPage() {                       // exportada: o teste renderiza sem router real
  const search = useSearch({ strict: false }) as XSearch;
  const query = useQuery(xQuery(search));
  return (
    <Card asPage>                               // @/components/page-card.js — sem faixa superior; o breadcrumb é o título do CardHeader
      <CardHeader title={t('x')} description={t('...')}>
        <CardAction>{/* ação primária + <PageMenu> com as secundárias */}</CardAction>
      </CardHeader>
      {/* listagem: abas (Tabs variant="line" ou SavedViews) e <RecordStats variant="band"> de GET /x/stats entre o header e o DataTable */}
      <CardContent>
        <DataTable search={{ value, onChange }} filters={{ content: <XFilters />, active: n }}>
          {query.isLoading ? <DefaultLoading /> : query.isError ? <DefaultEmptyData reason="error" onRetry={...} />
            : !items.length ? <DefaultEmptyData reason={hasFilters ? 'filtered' : 'empty'} /> : <XTable data={items} />}
        </DataTable>
      </CardContent>
    </Card>
  );
}
export const Route = createFileRoute('/_private/x/')({
  component: XPage,
  staticData: { title: t('x') },
  validateSearch: (s: Record<string, unknown>): XSearch => xSearchSchema.parse(s),
});
```

- `Card` sempre montado: loading/erro/vazio resolvidos **dentro** do `CardContent` (early-return
  antes do `Card` some com o breadcrumb). Early-return (`if (isLoading) return <DefaultLoading/>`)
  só em componente comum.
- Quem busca o dado decide loading/vazio; o filho recebe o dado pronto, nunca `isLoading` por prop.
- `Card` só em página. Componente comum usa `Item`/`ItemGroup`/`Panel`.
- Moldes completos (hub, listagem, detalhe, add, painel inline): `references/page-patterns.md`.

## 4. Componentes obrigatórios

| Situação | Use |
| --- | --- |
| Página | `<Card asPage>` + `CardHeader`/`CardAction`/`CardContent` (`@/components/page-card.js`) |
| Loading / vazio / erro | `<DefaultLoading/>`; `<DefaultEmptyData reason="empty\|filtered\|error">` |
| Tabela | Página: `<DataTable search filters>` (`@/components/data-table.js`, AD-077/AD-083; `toolbar` só para controles extras) envolvendo loading/vazio/tabela. Tabela: `Table*` de `@ethica/ui/components/table` num `@components/x-table.tsx`, **server-driven** (nunca filtra/ordena/pagina em memória) + `<TablePagination>`; coluna ordenável com `<TableHead sort={{ direction, onToggle }}>`; sem padding próprio nas células. Linha abre o detalhe do registro (`onClick` na `TableRow` + `cursor-pointer`); link na linha só quando o destino é outro registro (`TableIdentity link=…`, AD-089). Conteúdo da célula só com `TableIdentity`/`TableStack`/`TableIconText`/`TableStatus`/`TableRowActions` (AD-078) |
| Grupo de conteúdo | `Item`/`ItemGroup`/`ItemContent`/`ItemTitle`/... (`@ethica/ui/components/item`) |
| Hub (`index.tsx` que redireciona para as páginas do módulo) | `<PageIntro>` + `<LinkCardList>` com `<LinkCard render={<Link/>} icon title>` por destino (AD-095) |
| Link de texto para outra tela | `<AppLink to=… search=…>texto</AppLink>` (`@/components/app-link.js`, AD-089): estilo `link`, sublinhado tracejado e `ArrowUpRight` já incluídos; `as="description"` para texto de apoio |
| Cartão de redirecionamento (atalho, contador, indicador, registro relacionado, integração) | `<LinkList>` + `<LinkListItem render={<Link/>} icon title description>` (`@/components/link-list.js`, AD-075); sem `render` a linha é estática |
| Lista de destinos em hub (`/financeiro`, `/prospeccao`) | `<PageIntro>` (`@/components/page-intro.js`) + `<LinkCardList>` com `<LinkCard render={<Link/>} icon title meta={[…]}>` (`@/components/link-card.js`, AD-094); cabeçalho só com título e `CardAction`, conteúdo `max-w-4xl` à esquerda |
| Bloco dentro da página | `<Panel size>` (`@/components/panel.js`); `render={<form/>}` se for form |
| Formulário | `Form*` (`@ethica/ui/components/form`) + `react-hook-form` + `zodResolver(schema de @ethica/contracts)` + `<DefaultFormLayout>`; campos por `TextField`/`SelectField`/`MoneyField`/`DateField`/`TimeField`/`NumberField`/`TextareaField` (`@/components/form-fields.js`); `placeholder` em todo input |
| Select | `<Select items={[{value,label}]}>` (`@ethica/ui/components/select`) — `items` obrigatório |
| Leitura de registro (detalhe, integração) | `RecordHeader` (+ `RecordHeadingGroup` para vários pares) + `RecordStats` (faixa entre fios com divisórias) + `ProductSpecs` de `@/components/product-specs.js` (grupos colapsáveis rótulo/valor com ícone, ação e Expandir/Recolher tudo, AD-091) + `RecordTable` (lista livre tipo checklist), cabeçalho, faixa e lista de `@/components/record.js` (AD-072, AD-090); a tela só passa dados, sem `className` de identidade |
| Faixa de indicadores da listagem | `<RecordStats variant="band">` + `ListTrendStat` (`@/components/list-trend-stat.js`) |
| Gráfico | `ChartContainer` + `ChartTooltip`/`ChartTooltipContent`/`ChartLegend` (`@ethica/ui/components/chart`, recharts 3) com `config` de cores por token (`var(--chart-N)`, `var(--destructive)`); a tela passa os dados prontos, molde em `@/components/fluxo-financeiro-chart.js` (AD-104) |
| Criar/editar/agir sobre registro | `FormDialog` (`@/components/form-dialog.js`) ou página `/add` com `<DefaultFormLayout>`, decidido caso a caso (AD-070) |
| Ícone | só `lucide-react`; link para outra página leva `ArrowUpRight` |

## 5. React

- `function` declarations (nunca `React.FC`/arrow para componente).
- Ordem interna: router/contexto → queries/mutations → estado local → derivados (`useMemo`) →
  handlers → effects (raros) → render.
- Sem `fetch` em `useEffect` (use `query/`), sem `useEffect` para estado derivado (use `useMemo`),
  sem `localStorage` direto para dado de negócio.
- Nunca exibir id cru (ObjectId): mostre o nome e linke o detalhe.

## 6. Texto, datas e visual (resumo — detalhe nas referências)

- Toda string visível passa por `t(key)`; chave plana `snake_case` que nomeia o texto, não o lugar;
  reaproveite antes de criar. → `references/i18n-dates.md`
- Data/hora só via `@/lib/helpers/formatDate.helper.js`; `date-fns` só lá dentro.
- Todo texto de tela usa `ItemTitle` ou `ItemDescription` (`@ethica/ui/components/item`); ajustes tipográficos pequenos podem usar `className` no próprio wrapper (AD-087). → skill `ethica-item-typography`
- Identidade visual e cor moram no primitivo: em rota, `className` só de layout (`grid`, `gap`,
  `flex-1`, `col-span`, largura). Nada de `border`/`rounded`/`shadow`/`ring` em `<div>` de rota. → `references/visual.md`
- Altura de controle pelo contexto (AD-093): ação `h-8` (`Button`, `ToggleGroup`, `SelectTrigger size="compact"`),
  campo `h-11` (`Input`, `SelectTrigger`, `Button size="field"`); mesma linha, mesma altura. → `references/visual.md`

## 7. Checklist ao criar página/módulo

- [ ] Pasta + `index.tsx`; detalhe em `details/index.tsx` com `?id=`; nada de `.`/`$`.
- [ ] Card no hub do pai (e `staticData.title`); chave `t()` homônima ao segmento da URL quando a pasta tem `add`/`details`.
- [ ] `@` no nível certo (seção 1); nada importado de outro módulo de `routes/`.
- [ ] Dados por `query/<entidade>.ts` quando compartilhados, ou `@query/` quando locais; mutation invalida `xKeys.lists()` (e o detalhe).
- [ ] `Card` sempre montado; loading/vazio/erro dentro do `CardContent`.
- [ ] Teste ao lado; `pnpm run format && pnpm run check && (cd apps/web && pnpm run build)`.

## Referências

| Quando | Arquivo |
| --- | --- |
| Hub, listagem, detalhe (view/edit), add, painel inline, testes de página | `references/page-patterns.md` |
| `query/`, mutations, formulários | `references/data-layer.md` |
| Chaves `t()`, mensagens da API, datas | `references/i18n-dates.md` |
| Identidade visual, cores, links, Tailwind 4 | `references/visual.md` |
