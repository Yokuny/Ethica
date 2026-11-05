# Front-end (`apps/web`): camada global e rotas

Regras de página, formulário, tabela, texto e visual: skill `ethica-web-standards`. Aqui está o desenho das camadas e o roteiro de criação.

```
apps/web/src/
├── main.tsx          # providers montados uma vez: tema, QueryClient, tooltip, router, toaster
├── router.tsx        # queryClient + router (o queryClient vai no contexto do router)
├── routeTree.gen.ts  # gerado pelo plugin do TanStack Router; nunca editar
├── index.css         # Tailwind + tema + `@source` apontando para packages/ui
├── components/       # ┐
├── hooks/            # │ camada global: o que 2+ módulos usam
├── lib/              # │
├── query/            # ┘
└── routes/           # páginas por arquivo; cada nível com suas pastas @ locais
```

## Camada global

| Pasta | Entra | Molde |
| --- | --- | --- |
| `components/` | composição de primitivos que conhece rota, sessão, tradução ou domínio; os componentes padrão de página, tabela, formulário, leitura e estados; mapas de rótulo do domínio (`*-labels.ts`) | `apps/web/src/components/page-card.tsx`, `apps/web/src/components/data-table.tsx`, `apps/web/src/components/form-fields.tsx`, `apps/web/src/components/case-labels.ts` |
| `hooks/` | comportamento de tela reaproveitado por 2+ módulos (`useX.ts`) | `apps/web/src/hooks/useDebouncedSearch.ts` |
| `lib/api/` | o cliente HTTP: único lugar com `fetch`; nunca lança, devolve o envelope da resposta e traduz `message` uma vez | `apps/web/src/lib/api/client.api.ts` |
| `lib/helpers/` | função pura com teste ao lado: tradução (`t`), datas, dinheiro | `apps/web/src/lib/helpers/formatDate.helper.ts` |
| `query/` | um arquivo por entidade usada por 2+ rotas: tipos espelhados da API, `xKeys`, `xQuery` (`queryOptions`), `xMutation(queryClient)`; `session.ts` guarda a sessão e as checagens de acesso | `apps/web/src/query/transaction.ts`, `apps/web/src/query/session.ts` |

Nome de arquivo: `kebab-case` em `components/` e nas pastas `@`; `useX.ts` em `hooks/`; `<entidade>.ts` em `query/`; `<nome>.helper.ts` em `lib/helpers/`.

Antes de criar qualquer coisa na camada global, **procure**: componente parecido, chave de tradução, hook, factory de query. O que existe é estendido, não duplicado.

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

Módulo de `apps/web/src/routes/` nunca importa de outro módulo de rotas: se precisou, o código sobe. Ao subir, **mova** o arquivo (com o teste) e apague o antigo; não deixe re-export no lugar. Se o segundo consumidor some, o arquivo desce.

Primitivo × composição: sem regra de negócio, sem rota e sem sessão é primitivo (`packages/ui`); se conhece qualquer um desses, é do app (`apps/web/src/components`). Existe wrapper do app para o primitivo? Use o wrapper.

## Caminho do dado

```
packages/contracts (schema do payload)
        ↓
lib/api/client.api.ts (get/post/patch/del → envelope da resposta)
        ↓
query/<entidade>.ts ou @query/ (queryOptions e mutations)
        ↓
index.tsx da rota (useQuery, decide loading/vazio/erro)
        ↓
@components (recebem o dado pronto)
```

Sem store global: TanStack Query é a única fonte de dado de servidor; filtro, ordenação e paginação vivem na URL; a sessão é uma query (`sessionQuery`) lida pela guarda de rota.

## Rotas

Toda rota é pasta + `index.tsx`; layout é `route.tsx` na pasta pathless (`_public`, `_private`, `_private/_admin`); registro por search param (`details/?id=`); pastas `@components`, `@consts`, `@hooks`, `@interface`, `@query`, `@utils` por nível, criadas só com conteúdo. Detalhe e moldes: skill `ethica-web-standards`.

## Módulo de tela novo, na ordem

1. A API do módulo existe e o contrato está em `@ethica/contracts` (`references/backend.md`).
2. `apps/web/src/query/<entidade>.ts` (ou `@query/` se só uma rota usa): tipos espelhados, keys, queries e mutations.
3. `apps/web/src/routes/_private/<módulo>/index.tsx`: a página principal ou o hub; depois `list/`, `add/`, `details/` conforme o caso.
4. Navegação e acesso: entrada em `apps/web/src/routes/_private/@consts/home-sections.ts` e o segmento da URL em `apps/web/src/routes/_private/@utils/home-access.ts` (skill `ethica-permissions`).
5. Textos: chaves em `apps/web/src/lib/helpers/translate.helper.ts`, reaproveitando as genéricas.
6. Teste ao lado da página; `pnpm run check` e `(cd apps/web && pnpm run build)`.

## Segundo front em `apps/`

Reaproveita de graça `@ethica/ui` e `@ethica/contracts`. O que ele precisa montar:

- `index.css` com o `@source` para `packages/ui/src` e o **tema próprio** (o pacote de UI não carrega CSS de marca);
- `components.json` com os aliases apontando para `@ethica/ui`, para o shadcn instalar no pacote;
- alias `@`, porta própria com `strictPort` e `envDir: '../../'` no `vite.config.ts`;
- project próprio no `vitest.config.ts` da raiz (`references/monorepo.md`).

Cliente HTTP e dicionário `t()` hoje são do `apps/web`. O segundo front é o segundo consumidor: decida ali, com AD, se sobem para um pacote ou se ele tem os dele. Não crie o pacote antes.
