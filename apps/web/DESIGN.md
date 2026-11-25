---
name: Ethica
description: Workspace operacional minimalista, com sidebar de fundo, conteúdo recuado e dados em primeiro plano.
colors:
  sidebar: "#f1f1f3"
  sidebar-active: "#e8e7ec"
  canvas: "#f7f7f7"
  highlight: "#f2f2f2"
  raised: "#ffffff"
  action: "#1d1c20"
  action-hover: "#38373d"
  action-ink: "#ffffff"
  impact: "#1d1c1f"
  body-ink: "#4b4b54"
  secondary-ink: "#66656f"
  subtle-ink: "#9594a0"
  link: "#1c2638"
  border: "#e5e4e8"
  input-border: "#d8d7dd"
  focus: "#4b4b54"
  destructive: "#a64b4f"
  status-success-bg: "#dcefdc"
  status-success-ink: "#245b38"
  status-success-dot: "#5aa872"
  status-warning-bg: "#f3efd4"
  status-warning-ink: "#6d6025"
  status-warning-dot: "#a89236"
  status-error-bg: "#f4e3e1"
  status-error-ink: "#7d3d42"
  status-error-dot: "#b46166"
  status-info-bg: "#e1edf2"
  status-info-ink: "#365e6d"
  status-info-dot: "#6c9cae"
  status-neutral-bg: "#ebe9eb"
  status-neutral-ink: "#4b4b54"
  status-neutral-dot: "#93919a"
  chart-blue: "#8eaacb"
  chart-sage: "#9fbfa6"
  chart-sand: "#d6c38f"
  chart-pale-blue: "#c9d7e6"
  chart-lilac: "#cbbfdc"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.06em"
  numeric:
    fontFamily: "Geist Mono Variable, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "16px"
  inset: "18px"
spacing:
  shell-inset: "8px"
  row-y: "10px"
  row-x: "12px"
  block-gap: "16px"
  section-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 10px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.action-ink}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 10px"
  button-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "4px 10px"
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "{colors.body-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    height: "32px"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-active}"
    textColor: "{colors.impact}"
  content-inset:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.inset}"
  list-item:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  list-item-hover:
    backgroundColor: "{colors.sidebar-active}"
  icon-tile:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.md}"
    size: "32px"
  stats-band:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.impact}"
    padding: "20px 16px"
  badge-success:
    backgroundColor: "{colors.status-success-bg}"
    textColor: "{colors.status-success-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  table-header:
    backgroundColor: "transparent"
    textColor: "{colors.secondary-ink}"
    typography: "{typography.label}"
    height: "40px"
---

# Design System: Ethica

## Overview

**Creative North Star: "A mesa de trabalho serena"**

O Ethica é usado em sessões longas por peritas e equipes de escritório: achar um serviço, ler em que pé ele está e agir. A sidebar forma o fundo da aplicação e o trabalho acontece numa superfície clara recuada, como uma folha sobre a mesa. Dados, filtros e ações ficam perto uns dos outros; a hierarquia vem de bordas finas, pequenas diferenças de tom e do peso do texto, nunca de sombra, gradiente ou cor de marca. O modo é Operate: leitura rápida, consistência entre telas e expectativa nativa valem mais que expressão.

A referência visual enviada pelo usuário fixa a paleta grafite e a composição. Geist Variable é a sans de tudo; Geist Mono aparece só em atalhos e números tabulares. Há três temas (Claro, padrão; Escuro; Azul, AD-237), todos redefinindo os mesmos tokens de `apps/web/src/theme.css`; as cores deste documento são as do Claro.

O sistema tem componentes padrão para as composições que se repetem (cabeçalho de registro, faixa de números, hub de módulo, página de configuração em etapas, cartões de registro pequeno, blocos recolhíveis). Quando existe um componente padrão para o caso, a tela usa ele; quando não existe, a tela compõe direto com os primitivos de `@ethica/ui` (`Item`, `ItemTitle`, `ItemDescription`, `Button`, `Badge`) em vez de criar um wrapper novo que fixe desenho.

**Key Characteristics:**
- Sidebar pastel ao fundo, painel de trabalho recuado com raio de 18px, sem faixa superior.
- Grafite como única cor de ação; cor semântica só em status.
- Tipografia por `ItemTitle`/`ItemDescription`; captions em caixa alta com tracking.
- Plano: profundidade por tom e borda, sem sombra em controles e superfícies.
- Conteúdo na largura toda do painel; a faixa de números logo abaixo do cabeçalho.
- Indicadores só com dado real (AD-083).

## Colors

Grafite quase preto sobre cinzas frios e claros, com pastéis dessaturados reservados a status e gráficos.

### Primary
- **Grafite de Ação** (action): botão primário, controle ativo, dia de hoje na agenda, progresso, asterisco e cantos do `StepList`. Escurece no hover para o **Grafite de Hover** (action-hover). É a cor de ação do tema: um detalhe de destaque nunca ganha cor própria.

### Neutral
- **Fundo da Sidebar** (sidebar): a superfície externa do shell.
- **Lilás de Seleção** (sidebar-active): hover e item ativo do menu, hover de linha de lista, seleção e desabilitado.
- **Canvas** (canvas): o painel principal, o `Card` da página, a linha de lista e o campo de texto.
- **Cinza de Destaque** (highlight): faixa de números, ladrilho de ícone, superfície secundária.
- **Branco Elevado** (raised): menus, popovers e controles que sobem sobre a página.
- **Tinta de Impacto** (impact): títulos de registro, valores de maior peso, nome principal da linha da tabela, ícone do cabeçalho do registro.
- **Tinta do Corpo** (body-ink): texto padrão e navegação.
- **Tinta Secundária** (secondary-ink): metadados e apoio pequeno que precisa ser lido.
- **Tom Sutil** (subtle-ink): só pistas decorativas não essenciais.
- **Azul de Link** (link): azul escuro dessaturado, quase preto, do `AppLink`.
- **Fio** (border) e **Fio do Campo** (input-border): bordas de 1px; o foco usa **Anel** (focus).

### Status e gráficos
- Status de domínio em pares fundo/tinta pastel com bolinha indicadora: sucesso (status-success-*), atenção (status-warning-*), erro (status-error-*), informação (status-info-*) e neutro (status-neutral-*). O `Badge` de `packages/ui/src/components/badge.tsx` usa a paleta pastel equivalente do Tailwind (`emerald`, `yellow`, `red`, `blue`, `gray` em `-50`/`-900` com anel) sempre com a contraparte `dark:`.
- Série de gráficos pastel (chart-blue, chart-sage, chart-sand, chart-pale-blue, chart-lilac), na ordem, para identidade das partes; o que é agrupado ou sem classe fica cinza. Verde é dinheiro entrando, vermelho saindo, roxo previsto (AD-255).
- **Vermelho Contido** (destructive): só ação destrutiva e erro, em fundo de 10% no botão.

### Named Rules
**The One Voice Rule.** A única cor de ação é o grafite do tema. Azul não é acento genérico; cor aparece só para dizer estado.

**The Readable Small Text Rule.** Texto pequeno necessário à tarefa usa a Tinta Secundária, nunca o Tom Sutil.

## Typography

**Body Font:** Geist Variable (com `ui-sans-serif, system-ui, sans-serif`)
**Mono:** Geist Mono Variable, só em atalhos (`Kbd`) e números tabulares

**Character:** uma sans neutra e precisa em todos os papéis; a hierarquia vem de tamanho, peso e tom, não de troca de família.

### Hierarchy
- **Display** (600, 24px, 1.25): título do registro no `RecordHeading`, estado no `RecordStatus` e valor da faixa de destaques entre fios.
- **Headline** (500, 16px, 1.4, Tinta de Impacto): título de seção dos painéis do Início e do Dashboard.
- **Title** (600, 14px, 1.375): `ItemTitle` — nome de linha, título de bloco, valor. Variações (`font-medium`, `font-normal`, `tabular-nums`) são classes locais no próprio `ItemTitle`.
- **Body** (400, 14px, 1.5): `ItemDescription` em Tinta Secundária; corta em duas linhas por padrão (`line-clamp-none` quando o texto precisa aparecer inteiro).
- **Control** (500, 13px): botões, campos, abas e menu.
- **Label** (500, 11px, tracking 0.06em, caixa alta): captions da faixa de destaques, cabeçalho de tabela e título de bloco simples. A preferência de texto grande sobe para 12px.

### Named Rules
**The Two Wrappers Rule.** Todo texto de tela é `ItemTitle` ou `ItemDescription` (AD-087); a tag muda por `render` quando a semântica pede (`h2`, `dt`, `dd`, `label`, `Link`).

**The Data Over Label Rule.** Em lista, tabela e faixa, o dado é `ItemTitle` e o rótulo ou contexto é `ItemDescription` (AD-293): o número se lê antes da palavra que o explica.

## Layout

No desktop, a sidebar ocupa 18rem e fica ao fundo; o `SidebarInset` recebe 8px de recuo em cima, à direita e embaixo, borda fina e raio de 18px. Não há faixa superior: o gatilho da sidebar fica no cabeçalho dela e a conta no rodapé. No celular a sidebar vira drawer, aberto pela célula "Menu" do `MobileDock`.

`Card asPage` compõe cada página. O `CardHeader` é uma linha: o breadcrumb com ícone do módulo é o título, a descrição em uma frase logo abaixo, e as ações à direita (ação primária, depois o menu "…" do `PageMenu`); não há botão voltar. Abaixo, nesta ordem: abas de recorte (`Tabs variant="line"`), a faixa de indicadores (`RecordStats variant="band"`) colada no cabeçalho e fora do `CardContent`, na largura toda do painel (Início, Serviços, Dashboard — AD-292), e o conteúdo. Não se repete uma segunda faixa no meio da página.

O conteúdo ocupa a largura toda do painel: listas, tabelas e blocos não levam `max-w-*` (AD-288). A exceção é o hub de módulo, cuja introdução e cartões de destino formam uma coluna de leitura (`max-w-4xl`, AD-094). As páginas públicas (site, login, cobrança) centralizam o conteúdo em `max-w-6xl`.

Ritmo: 8px entre linhas de lista, 16px dentro de um bloco, 40px entre seções do Início e do Dashboard. Toda listagem tem toolbar de uma linha (Filtros em popover e busca sem moldura), rolagem horizontal interna quando as colunas não cabem, e busca, filtros, ordenação e paginação na URL.

### Named Rules
**The Balanced Strip Rule.** A faixa de números tem colunas pelo número de células (4 → 2 e 4 a partir de `xl`; 5 → 3 e 5 a partir de `xl`; 6 → 3 e 6 a partir de `2xl`): as linhas ficam sempre equilibradas e nenhuma célula fica sozinha. No celular a faixa cinza tem duas colunas e a última célula ímpar ocupa a linha (AD-298).

## Elevation & Depth

O sistema é plano. A profundidade vem do tom (sidebar atrás, canvas na frente, destaque cinza dentro) e da borda de 1px. Botão, campo, seletor, grupo de botões, linha de lista, cartão, grade da agenda e o próprio painel principal não têm sombra (AD-289, AD-294). Sombra existe só onde há sobreposição de verdade, com deslocamento curto e opacidade baixa.

### Shadow Vocabulary
- **Sobreposição curta** (`box-shadow: 0 4px 10px -3px rgb(29 28 32 / 0.08), 0 2px 4px -2px rgb(29 28 32 / 0.04)`): menus e popovers.
- **Diálogo** (`box-shadow: 0 12px 24px -8px rgb(29 28 32 / 0.11), 0 4px 10px -4px rgb(29 28 32 / 0.05)`): diálogos e drawers.
- **Sobre o mapa** (`box-shadow: 0 1px 2px 0 rgb(29 28 32 / 0.04), 0 2px 5px -2px rgb(29 28 32 / 0.04)`): controles flutuando sobre o mapa e a sidebar flutuante.

### Named Rules
**The Flat Surface Rule.** Se o elemento está na página e não sobre ela, ele não tem sombra. Separe com borda e tom.

## Shapes

Raio base de 10px. Controles usam 8px, selos 6px, linhas de lista 10px, cartões de destino e de registro 14px, o grupo de cartões de registro 16px e o inset do shell 18px. Bordas de 1px discretas. Ladrilhos de ícone são quadrados arredondados em Cinza de Destaque: 32px na linha de lista, 48px (celular) a 64px no cabeçalho do registro e no cartão de destino. Fios separam toolbar, cabeçalho, linhas e rodapé sem aninhar cartão dentro de cartão.

## Components

### Buttons
- **Shape:** cantos levemente arredondados (8px), 32px de altura; a variante `field` tem 44px para alinhar ao lado de campos.
- **Primary:** Grafite de Ação com texto branco, escurecendo no hover; só uma ação primária por cabeçalho.
- **Outline:** canvas com borda de campo; ações secundárias e botões dentro de blocos.
- **Ghost / Destructive:** ghost para ações de baixa ênfase dentro de linhas; destrutivo em vermelho contido a 10% de fundo.
- **Focus:** borda e anel finos na cor do Anel; sem sombra em nenhum estado.

### Chips / Badges
- **Style:** selo de 6px de raio, texto de controle em peso médio, fundo pastel com anel interno da mesma família; pode levar a bolinha de status (`BadgeIndicator`).
- **Uso:** estado do registro, tipo do compromisso, alerta de prazo. Fica à direita da linha, em `ItemActions`.

### Inputs / Fields
- **Style:** 44px, canvas, borda de campo de 1px, raio de 8px, texto de controle; placeholder em Tinta Secundária.
- **Focus:** borda no Anel com anel de 3px a 20%.
- **Error / Disabled:** borda e anel em vermelho contido; desabilitado em Cinza de Destaque com opacidade reduzida.

### Navigation
- Sidebar com itens de 32px, ícone e texto de controle; hover e ativo em Lilás de Seleção, ativo com mais peso e Tinta de Impacto. Recolhida, alinha gatilho, busca, links e conta em caixas de 32px. No celular, o `MobileDock` leva Início, Serviços, Agenda, Logística e Menu.

### Lists
- **Linha (`Item`):** cada linha é o próprio cartão com borda de 1px, raio de 10px, sem sombra; o grupo (`ItemGroup`) só empilha com 8px de espaço (AD-289). Ícone em ladrilho de 32px à esquerda (`ItemMedia variant="icon"`), dado em `ItemTitle`, contexto em `ItemDescription`, selos em `ItemActions` à direita e, quando a linha abre outra tela, a seta `ArrowUpRight` em Tinta Secundária no fim (AD-288, AD-290). Linha que leva a outra tela é `<li><Item render={<Link/>}>`; linha estática é `<Item render={<li />}>`. Hover em Lilás de Seleção a 70%.

### Tables
- `DataTable` integrado ao painel: cabeçalho em caption, linhas de 48px, hover em Cinza de Destaque, seleção em Lilás de Seleção. A célula principal (`TableIdentity`) tem avatar ou ladrilho de ícone e o nome em `ItemTitle` médio na Tinta de Impacto; as demais (`TableStack`) têm o valor em `ItemTitle` regular e o apoio em `ItemDescription` menor (AD-293). A linha inteira abre o detalhe; só leva link dentro quando o destino é outro registro.

### Record page
- `apps/web/src/components/record.tsx` (AD-090): `RecordHeader` com `RecordHeading` (ladrilho de ícone na cor do título, caption em caixa alta e título Display) e `RecordStatus` à direita; logo abaixo, a faixa de destaques entre fios (`RecordStats`) sem divisória vertical, com a Balanced Strip Rule. Depois as seções: `ProductSpecs` (grupos recolhíveis rótulo/valor com "Expandir tudo · Recolher tudo", AD-091) e os blocos recolhíveis `Panel` (borda, ícone, título, ações, "Não preenchido" esmaecido e no fim da página, AD-172, AD-238). Listas de itens do registro são `ItemGroup`/`Item` montados na página (AD-296).

### Stats band
- `RecordStats variant="band"` em Cinza de Destaque, sem divisórias: caption de controle, valor a 22px em peso normal, dica pequena ao lado, sparkline, régua de traços da proporção e seta de tendência tingida (verde bom, vermelho ruim) quando há série real; `ListTrendStat` acrescenta o tooltip "?" com a comparação. Célula que navega leva o estilo de link no valor e a seta.

### Signature compositions
- **Hub de módulo** (`PageIntro` + `HubIllustration` + `LinkCardList`/`LinkCard`, AD-094/AD-299): introdução com ilustração e recursos, depois cartões de destino de 14px de raio com ladrilho de 64px, título, apoio "A / B" e seta que sobe na diagonal no hover.
- **Página de configuração** (`StepList`/`StepItem`, AD-224/AD-299): título grande com asterisco na cor de ação à esquerda, fixo a partir de `lg`; etapas numeradas à direita entre fios, cada uma com o próprio formulário. Usada em Escritório, Minha conta e Relatórios.
- **Cartões de registro** (`InfoCardList`/`InfoCard`, AD-225/AD-226): moldura cinza de 16px com cartões de 14px, um por linha, valor em destaque com cauda esmaecida, selo e ações no rodapé. Usada em metas do ano, responsáveis técnicos e aparelhos.
- **Contagem por grupo** (`HeatTiles`): blocos em tom pastel proporcional à quantidade, com a legenda Menos/Mais.

### Links
- `AppLink` é o único link de texto: `Link` sobre `ItemTitle` ou `ItemDescription`, Azul de Link, sublinhado tracejado sempre visível e `ArrowUpRight` ao final (AD-089). Texto abaixo de um valor sublinhado mantém pelo menos 6px de folga.

## Do's and Don'ts

### Do:
- **Do** definir identidade em `apps/web/src/theme.css` e nos primitivos; a rota compõe dados e layout local.
- **Do** usar o componente padrão quando ele existe para o caso (hub, página em etapas, cartões de registro, cabeçalho e faixa do registro, blocos recolhíveis); sem componente padrão, compor direto com `Item`/`ItemTitle`/`ItemDescription` na página em vez de criar um wrapper que fixe desenho.
- **Do** colocar a faixa de números logo abaixo do cabeçalho, fora do `CardContent`, na largura toda.
- **Do** separar dado e contexto: número em `ItemTitle`, rótulo em `ItemDescription`.
- **Do** conferir 1440px e 390px na tela de verdade, com o Playwright logado (RUN_BOOK.md, "Conta de teste em tela"): sem rolagem lateral, sem célula sozinha numa faixa, sem texto colado em sublinhado, sem sombra em controle; e hover, foco, loading, erro e vazio.
- **Do** preservar consultas, permissões, URLs e comportamento das ações ao redesenhar uma tela.

### Don't:
- **Don't** pôr sombra em botão, campo, cartão, linha de lista ou no painel principal.
- **Don't** limitar com `max-w-*` lista, tabela ou bloco do app logado; só o hub de módulo tem coluna de leitura.
- **Don't** usar cor da paleta do Tailwind sem a contraparte `dark:` (vale nos temas Escuro e Azul); prefira os tokens.
- **Don't** dar a um detalhe de destaque uma cor própria: ele usa a cor de ação do tema (AD-237).
- **Don't** usar azul como acento genérico; as cores semânticas de status são a exceção.
- **Don't** recriar `Button`, `Badge` ou abas em `apps/web`: existem só em `@ethica/ui`.
- **Don't** usar o Tom Sutil em texto pequeno que precisa ser lido, nem mono para corpo ou rótulos.
- **Don't** inventar companhia, cargo, cidade, séries temporais ou ações em lote para preencher a tela.
