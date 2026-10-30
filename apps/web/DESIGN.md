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
border: "#e5e4e8"
input-border: "#d8d7dd"
focus: "#4b4b54"
destructive: "#a64b4f"
status-success-bg: "#dcefdc"
status-success-ink: "#245b38"
status-warning-bg: "#f3efd4"
status-warning-ink: "#6d6025"
status-error-bg: "#f4e3e1"
status-error-ink: "#7d3d42"
status-info-bg: "#e1edf2"
status-info-ink: "#365e6d"
status-neutral-bg: "#ebe9eb"
status-neutral-ink: "#4b4b54"
typography:
headline:
fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "18px"
fontWeight: 600
lineHeight: 1.4
letterSpacing: "-0.025em"
title:
fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "14px"
fontWeight: 600
lineHeight: 1.4
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
caption:
fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
fontSize: "11px"
fontWeight: 500
lineHeight: 1.4
letterSpacing: "0.06em"
rounded:
sm: "6px"
md: "8px"
lg: "10px"
xl: "14px"
inset: "18px"
spacing:
shell-inset: "8px"
page: "16px"
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
input:
backgroundColor: "{colors.canvas}"
textColor: "{colors.body-ink}"
typography: "{typography.control}"
rounded: "{rounded.md}"
height: "32px"
table-header:
backgroundColor: "transparent"
textColor: "{colors.secondary-ink}"
typography: "{typography.caption}"
height: "40px"
---

# Design System: Ethica

## Overview

**Direção: mesa de trabalho serena.** O Ethica é usado durante sessões longas. A sidebar forma o fundo da aplicação, enquanto o trabalho acontece em uma superfície clara recuada. Dados, filtros e ações ficam perto uns dos outros; bordas finas e pequenas diferenças de tom estabelecem a hierarquia. Este documento descreve somente apps/web.

A referência enviada pelo usuário fixa a paleta e a composição. Geist Variable é a aproximação sans adotada para o raster (a fonte original da imagem não foi identificada como fato); Geist Mono aparece só em atalhos e números tabulares. O modo é Operate: achar um registro, ler seu estado e agir rapidamente.

**Características:** um único tema claro; ação grafite; sidebar pastel atrás do painel; sem faixa superior; abas, faixa de indicadores e toolbar de uma linha em toda listagem; captions sans em caixa alta; sombra com deslocamento mínimo; indicadores apenas quando apoiados por dados reais (AD-083).

## Colors

| Papel                    | Token CSS           | Valor   | Uso                                  |
| ------------------------ | ------------------- | ------- | ------------------------------------ |
| Fundo da sidebar         | --sidebar           | #f1f1f3 | Superfície externa do shell          |
| Hover e ativo do menu    | --sidebar-accent    | #e8e7ec | Navegação, seleção e hover           |
| Canvas de trabalho       | --background        | #f7f7f7 | Painel principal e Card asPage       |
| Destaque secundário      | --surface-secondary | #f2f2f2 | Itens enfatizados sem cor forte      |
| Superfície elevada       | --surface-raised    | #ffffff | Menus, popovers e controles elevados |
| Ação                     | --primary           | #1d1c20 | Botão primário e controles ativos    |
| Texto de impacto         | --impact            | #1d1c1f | Nomes e valores de maior peso        |
| Texto padrão             | --foreground        | #4b4b54 | Corpo e navegação                    |
| Texto secundário legível | --text-secondary    | #66656f | Metadados e apoio pequeno            |
| Tom sutil da referência  | --subtle-foreground | #9594a0 | Pistas decorativas não essenciais    |

--primary-hover é #38373d; --border é #e5e4e8; --input é #d8d7dd; --ring é #4b4b54. Os tokens completos, inclusive seleção, desabilitado, gráficos e estados de domínio, estão em apps/web/src/theme.css. O valor #9594a0 não substitui --text-secondary em texto pequeno necessário à tarefa. Status de domínio usam variantes suaves de apps/web/src/components/badge.tsx; sua cor continua expressando significado, sem virar o acento global.

## Typography

**Sans:** Geist Variable, servido de apps/web/public/fonts/geist/ com fallback de sistema. Corpo, títulos, controles, tabela e navegação usam --font-sans.

**Mono:** Geist Mono Variable, servido de apps/web/public/fonts/geist-mono/, só para atalhos (Kbd) e números tabulares. Captions usam --font-caption (sans), 11px, peso 500, caixa alta e tracking 0.06em; a preferência de texto grande amplia captions para 12px. Cabeçalhos de tabela seguem o mesmo papel; rótulos de grupo da sidebar são sans normais, 12px, em --text-secondary. Números de destaque em RecordStat usam classes locais no ItemTitle.

ItemTitle e ItemDescription de packages/ui/src/components/item.tsx continuam a única API para texto de tela. Eles carregam família, tamanho, peso e cor padrão; variações pontuais são classes no próprio wrapper. Texto do corpo fica em 14px e controles em 13px na escala padrão; a preferência de tamanho de texto continua ajustando os tokens. Links para outras telas usam AppLink: azul escuro dessaturado (--link, #1c2638), sublinhado tracejado sempre visível e ArrowUpRight ao final (AD-089).

## Layout

No desktop, WorkspaceNavigation usa Sidebar em variante inset. A sidebar ocupa 18rem da moldura e permanece ao fundo; SidebarInset recebe 8px de recuo superior, direito e inferior, borda fina, raio de 18px e sombra curta; à esquerda ele começa junto da largura reservada para a sidebar. Não há faixa superior: o SidebarTrigger fica no cabeçalho da sidebar, ao lado do workspace, e o usuário (conta, tamanho do texto, sair) no rodapé, num menu que abre para cima. No celular a sidebar vira drawer, aberto pela célula "Menu" do MobileDock.

Card asPage compõe o conteúdo dentro do painel. CardHeader é uma linha: o breadcrumb com ícone em cada item (reui `breadcrumb-5`; ícone só no módulo, igual ao da sidebar; texto 12px) é o título (o último item é a página atual, os anteriores são links) e as ações (CardAction: ação primária, depois o menu "…" de PageMenu) ficam à direita; não há botão voltar. Abaixo vêm, nesta ordem: abas de recorte (Tabs variant="line"), a faixa de indicadores (RecordStats variant="band") e o DataTable.

Toda listagem (clientes, tarefas, processos, catálogo, pedidos) segue essa composição. Os indicadores vêm de GET /<entidade>/stats (contagem real por grupo, panorama do tenant); falta de dado aparece como traço. Recortes salvos viram abas (Todos, um por recorte, "+" para salvar o atual; Gerenciar fica no menu "…"). DataTable tem toolbar de uma linha: Filtros (popover) e busca sem moldura; rolagem horizontal interna quando as colunas não cabem. Busca, filtros, ordenação e paginação permanecem ligados à URL e ao servidor.

## Elevation & Depth

A profundidade vem primeiro de tons e bordas. A superfície principal usa --shadow-xs, atualmente 0 1px 2px rgb(29 28 32 / 0.04). Menus e sobreposições podem usar degraus maiores da mesma escala de apps/web/src/theme.css. Sombra sempre tem deslocamento e opacidade baixa; não se usa halo colorido para separar áreas.

## Shapes

O raio base é 10px. Controles usam 8px, cartões comuns 10px e o inset do shell 18px. Bordas de 1px são discretas. Fios separam toolbar, cabeçalho, linhas e rodapé sem produzir cartões aninhados para cada pedaço de informação.

## Components

### Sidebar e shell

O menu usa --sidebar-accent no hover e no ativo; o item ativo também ganha peso e indicação no ícone. Recolhida, a sidebar alinha gatilho, busca, links e conta em caixas de 32px; a busca fica sem contorno. Aberta, a busca tem fundo branco e contorno. A busca de navegação por teclado segue restrita às áreas permitidas. O painel principal nasce do SidebarInset, portanto uma rota não recria seu fundo, padding, raio ou sombra.

### Botões e campos

O botão primário usa --primary com texto branco e escurece para --primary-hover; botões comuns e alternadores têm 32px. A variante `field` do Button tem 44px para alinhar gatilhos de data e ações ao lado de Input e Select, que também têm 44px. Na toolbar da tabela, InputGroup tem 32px. Foco usa --ring visível; desabilitado perde intensidade e interação. Campos usam borda --input, fundo da superfície e texto sans.

### Tabelas, indicadores e status

DataTable é uma faixa integrada ao painel: toolbar compacta, cabeçalho sans em caixa alta, linhas de 48px, hover em --surface-secondary e seleção em --selection. A célula principal conserva avatar e nome; status aparece em selo pastel; ações reais ficam no menu da linha. Indicadores usam RecordStats variant="band" (superfície cinza, sem divisórias) com valores dos endpoints de stats; a régua de traços sob o número mostra a proporção real do grupo no total. O total de clientes também mostra a série diária real de criação e a comparação entre períodos de 30 dias.

### Página de registro

Detalhes e integrações usam apps/web/src/components/record.tsx, no modelo das telas do iotlog-frontend-v2 (AD-090). Cabeçalho com um ou mais pares rótulo em caixa alta + título a 24px e o estado à direita; logo abaixo, a faixa de destaques entre fios (em cima e embaixo) com divisória vertical entre células, rótulo caption e valor a 24px, sem superfície de fundo; depois as seções colapsáveis num cartão com linhas rótulo/valor; e a lista livre (RecordTable), título a 24px e linhas entre fios com ícone de situação em círculo tingido pelos tokens --status-* e células rótulo sobre valor. Os usos não passam classe de identidade.

### Links

AppLink (apps/web/src/components/app-link.tsx) é o único link de texto: Link de verdade sobre ItemTitle ou ItemDescription, com a classe link de theme.css e a seta. A célula de RecordStat que navega recebe o mesmo estilo. Controles de ação mantêm seus próprios estados e nomes acessíveis; a linha clicável da tabela abre o detalhe do registro e só leva link dentro quando o destino é outro registro.

## Do's and Don'ts

### Do

- Defina identidade em apps/web/src/theme.css e nos primitivos; a rota compõe dados e layout local.
- Use ItemDescription com classes locais de caption para rótulos descritivos e texto secundário legível para informação essencial.
- Confira 1440px e 390px, hover, ativo, seleção, foco, loading, erro e vazio.
- Preserve consultas, permissões, URLs e comportamento das ações ao redesenhar uma tela.

### Don't

- Não reintroduza troca de paleta ou modo escuro nesta direção de tema claro único.
- Não invente companhia, cargo, cidade, séries temporais ou ações em lote para copiar a imagem.
- Não recrie Button, Badge ou abas em apps/web: existem só em @ethica/ui; a rota importa e usa sem className de identidade.
- Não use azul como acento genérico; as cores semânticas de status são a exceção.
- Não use #9594a0 para texto pequeno que precisa ser lido, nem mono para corpo ou rótulos.
- Não espalhe borda, sombra e fonte de identidade pelas rotas.
