# Identidade visual do apps/web

## Mora no primitivo, não na rota

O sistema em vigor é o **workspace visual minimalista de tema claro único** (AD-082), descrito em `apps/web/DESIGN.md`. A sidebar `#f1f1f3` é o fundo; o painel de trabalho recuado usa `#f7f7f7`, borda fina e sombra leve. A ação principal é grafite `#1d1c20`; seleção e hover da sidebar usam `#e8e7ec`. A identidade é aplicada em `apps/web/src/theme.css`, nos primitivos de `packages/ui/src/components/` e no shell de `apps/web/src/routes/_private/`. Rota compõe dados, não recria o tema.

Escolha do agrupador: `ItemGroup` (padrão `grid`) para cartões independentes; `ItemGroup variant="list"` para lista de registros numa superfície; `LinkList`/`LinkListItem` (`apps/web/src/components/link-list.tsx`, AD-075) para cartão que leva a outra tela. Filtro de visão usa `Tabs variant="line"` de `@ethica/ui`. `Button` e `Badge` vêm só de `@ethica/ui/components/*`: a ação principal fica no cabeçalho com `Button` padrão, as secundárias vão no `PageMenu` ("…") ou usam `outline`; remover usa `destructive`.

Em rota, `className` de identidade deve ser evitado. Classes de layout local (`grid-cols-*`, `gap-*`, `flex-1`, `col-span-*`, largura máxima) são normais. Se a mesma borda, sombra, raio ou fonte aparece em várias rotas, mova o estilo para o primitivo responsável.

Armadilha do Tailwind 4: `divide-*` sai em `:where()` (especificidade 0) e pode sumir; use `[&>*:not(:first-child)]:border-t` quando o agrupador precisa de divisores.

## Página de registro (AD-072, AD-090)

Detalhe e integração seguem um modelo só, o das telas do `iotlog-frontend-v2`, e a estética inteira mora em `apps/web/src/components/record.tsx`. A rota só escolhe os dados; não passe classe de borda, cor, fonte ou espaçamento para esses componentes. Ordem, de cima para baixo:

1. **Cabeçalho** — `RecordHeader` com `RecordHeading` (rótulo em caixa alta + título a 24px, ícone, `badge` em seguida do rótulo e linha secundária `description` opcionais). Vários pares à esquerda vão num `RecordHeadingGroup`; à direita, `RecordStatus` (bolinha + estado a 24px) ou um `RecordHeading align="end"`.
2. **Faixa** — `RecordStats` + `RecordStat`: fio em cima e embaixo, divisória vertical entre as células (a partir de `md`), rótulo em caixa alta e valor a 24px. Até 5 células; `render={<Link/>}` faz da célula um link, `dot` põe a bolinha de status, `description` explica o valor. Abaixo de `sm` empilha; entre `sm` e `md`, duas por linha.
3. **Seções** — `ProductSpecs` (`@/components/product-specs.js`, AD-091): um só por tela, com os grupos como dados (`id`, `name`, `icon`, `actions`, `specs` rótulo/valor/`description`, `children` para formulário/tabela/estado, `footer` para paginação).
4. **Lista livre** — `RecordTable` (título a 24px) + `RecordTableRow` (`media` = `RecordTableMedia` com a situação: `success`/`warning`/`error`/`info`/`neutral` e `label` acessível) + `RecordTableCell` (rótulo sobre valor; o valor pode ser texto, `Badge` ou link). Use para listas de itens do registro que se leem em colunas (checklist, campos de um modelo).

A faixa das listagens é outro visual: `RecordStats variant="band"` (superfície cinza, sem divisórias, com sparkline/régua/tendência de `ListTrendStat`).

## Altura dos controles (AD-093)

Há duas alturas de controle, e o contexto escolhe qual, não o componente:

| Contexto | Altura | Componentes |
| --- | --- | --- |
| **Ação** — barra de ferramentas, cabeçalho, rodapé de formulário, menus | `h-8` | `Button` (`size` padrão / `icon`), `ToggleGroup`, `ButtonGroup`, `SelectTrigger size="compact"` |
| **Campo** — dentro de formulário ou grade de filtros, ao lado de um `Input` | `h-11` | `Input`, `SelectTrigger` (padrão), `Button size="field"` (gatilho de data, ação colada num input) |

Por quê: o `Input` é `h-11` para ser confortável de preencher e tocar; a interface em volta (ações de página) fica em `h-8`, mais leve. Controles numa mesma linha devem ter a mesma altura — um `Select` de `h-11` entre botões de `h-8` fica desproporcional, e um botão de `h-8` colado num input de `h-11` fica desalinhado. Por isso cada primitivo traz a variação do outro contexto: o padrão de cada um é o seu contexto natural (`Button` é ação, `Select` é campo) e a prop `size` cobre o caso oposto. Os valores ficam nos primitivos (`packages/ui/src/components/{button,select,input,toggle-group}.tsx`); a rota escolhe `size`, nunca passa `h-*` por `className`.

## Cor e tipografia

Os tokens semânticos ficam em `apps/web/src/theme.css`. `--background` é o canvas; `--surface-secondary` destaca um item sem cor forte; `--surface-raised` atende menus; `--primary` é ação; `--ring` é foco; `--status-*` guarda cores pastéis dos estados de domínio. `--subtle-foreground` (`#9594a0`) serve a pistas decorativas; informação pequena legível usa `--text-secondary` (`#66656f`). Consulte o CSS para valores e aliases Tailwind atuais.

Corpo, títulos, navegação e controles usam Geist Variable. Rótulos descritivos curtos e cabeçalhos de tabela usam Geist sans em caixa alta; Geist Mono fica reservado a atalhos e dados tabulares. Em texto de tela, use `ItemTitle` ou `ItemDescription` com classes locais pequenas quando necessário, conforme a skill `ethica-item-typography`. `Label` aplica o estilo de caption em formulários. O tema é sempre claro; não crie variantes escuras ou seletor de paleta.

## Links e navegação

- Link de texto para outra tela usa `AppLink` (`@/components/app-link.js`, AD-089): azul escuro dessaturado (`--link`), sublinhado tracejado sempre visível e `ArrowUpRight` ao final, sobre `ItemTitle` ou `ItemDescription` (`as="description"`). Na célula de `RecordStat` o estilo vem da classe `link`. Link só com ícone precisa de nome acessível.
- Tabela: a linha inteira abre o detalhe do registro; link dentro da linha só quando o destino é outro registro (`TableIdentity link={{ to, search }}`, que não propaga o clique para a linha).
- Desktop navega pela sidebar do shell (`apps/web/src/routes/_private/@components/workspace-navigation.tsx`) e pelo breadcrumb da faixa de `Card asPage`. Mobile usa o drawer da sidebar e `apps/web/src/components/mobile-dock.tsx`.
- Tabela densa usa `DataTable` e os primitivos `Table*`: toolbar compacta, cabeçalho mono, hover em superfície secundária, seleção em `--selection`, scroll horizontal interno e estados de loading/erro/vazio claros.
- Preserve consultas, URL, permissões, status semânticos e ações reais ao mudar o visual. Não invente colunas ou métricas a partir da referência.
