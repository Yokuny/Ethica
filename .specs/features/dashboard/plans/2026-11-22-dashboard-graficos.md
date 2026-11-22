# Plano — Dashboard e Início reformulados com gráficos (2026-11-22)

Arquivar em `.specs/features/dashboard/plans/` ao concluir. Supersede a AD-253/254 (barras), que o usuário recusou:
"não quero gráfico de barras; existem gráficos que agrupam e apresentam melhor; falta hierarquia visual e cor
indicativa". Guia do usuário: `apps/web/src/routes/_private/dashboard.md`. Estrutura e cores aprovadas por ele em
2026-11-22.

## Linguagem de cor (a mesma nas duas telas)

| Cor | Significado |
| --- | --- |
| Verde (`status-success-indicator`) | Dinheiro que entra (Recebido), saldo positivo, melhora |
| Vermelho (`status-error-indicator`) | Dinheiro que sai (Despesas), saldo negativo, vencido/atrasado, piora |
| Âmbar (`status-warning-indicator`) | Atenção: prazo que vence logo |
| Roxo (`chart-5`) | Previsto: a receber pelo vencimento |
| Paleta `chart-1..4` | Identidade de categoria/tipo/justiça (sem estado) |
| Cinza (`status-neutral-indicator`) | "Outros" agrupados, sem classificação ("Sem justiça") |

Estado nunca só por cor: ícone de seta, sinal e texto ("positivo", "em atraso").

## Dashboard (`apps/web/src/routes/_private/dashboard/`)

Um período (6/12 meses) no cabeçalho vale para a página toda.

1. **Nível 1 — Como estamos?** Faixa de KPIs (`RecordStats band`): Saldo do período, Recebido, Despesas,
   A receber (com o vencido) e Serviços novos. Cada um com linha de tendência mês a mês, variação contra o
   período anterior de mesmo tamanho e a cor de "bom/ruim" (despesa subindo é ruim). O dinheiro aparece só com o
   Financeiro. Logo abaixo, alertas por regra: honorários vencidos (`lateCents > 0`) e saldo negativo no período,
   cada um com link para a lista.
2. **Nível 2 — Dinheiro.** O fluxo de caixa vira um gráfico de linhas com o eixo a partir de 0: Recebido em área
   verde, Despesas em linha vermelha e A receber em linha tracejada roxa. Abaixo, "Ver mês a mês" recolhido com a
   `CashFlowTable`. Depois, duas roscas: **De onde vem** (receitas) e **Para onde vai** (despesas) por categoria.
   O centro mostra o total e a variação; ao lado, uma legenda escrita com valor, % e variação. Acima de 4 fatias,
   o resto entra em "Outros (n)".
3. **Nível 2 — Trabalho.** **Entrada de serviços** em área empilhada por tipo, mês a mês no período, e o **Mix de
   serviços** em rosca (todos os serviços, total no centro). Cada tipo abre a lista filtrada. Abaixo, "Ver mês a
   mês" recolhido com a `CasesMonthTable`. Tipo tem a mesma cor nos dois gráficos (os 4 maiores, o resto em
   "Outros").

Dados: o fluxo pede `2 × meses` (período anterior completo). `GET /expert-cases/dashboard` passa a mandar 24
meses em `byMonth`, para comparar os novos também em 12 meses. Categorias já trazem `previousCents` (AD-253).

## Início (`apps/web/src/routes/_private/index.tsx`)

- Faixa: prazos vencidos com ponto vermelho e os que vencem logo com ponto âmbar, quando houver.
- Fluxo de caixa: o mesmo gráfico de linhas (6 meses).
- Serviços por justiça: rosca com "Sem justiça" em cinza, o denominador escrito e cada justiça abrindo a lista
  filtrada.
- Serviços por fase segue em blocos de calor (heatmap).

## Componentes

- Novos: `apps/web/src/components/cash-flow-chart.tsx` e `composition-donut.tsx` (Dashboard e Início).
- Locais do Dashboard: KPIs, alertas, área de serviços e as séries de tipo.
- `RecordStat` ganha `trendTone`, para a seta seguir bom/ruim em vez de cima/baixo.
- Saem `bar-list.tsx`, `dashboard/@components/category-bars.tsx` e `_private/@components/court-composition.tsx`.

## Registro e verificação

- AD-255 (supersede AD-253/254 na forma e a regra "número escrito sem gráfico" da AD-235/236 nos painéis).
- Atualizar a skill `ethica-web-standards` (linha "Números no painel"), `feature.md`, roadmap e `pnpm docs:sync`.
- Gate: `pnpm run format`, `pnpm run check`, build do web e testes de unidade das duas telas.
- A tela no navegador fica com o usuário: três temas e celular.
