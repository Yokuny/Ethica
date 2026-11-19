# Plano — dashboard com valores escritos e ações secundárias no menu "…" (2026-11-19)

Pedido do usuário com quatro imagens de referência (barra de filtros, tabela de calor, gráfico de categorias, dashboard atual) e o estudo de design de dados dele. Decisão: AD-235.

1. `ToggleGroup` (`packages/ui`): tirar os divisores entre os itens; borda única na barra, caixa tingida só no item marcado.
2. Serviços e Varas e comarcas: "Importar planilha" vai para o `PageMenu`, como em Usuários; "Adicionar" fica como ação principal.
3. Fluxo de caixa: trocar o gráfico de colunas por tabela de calor (meses × recebido/a receber/despesas/saldo), valor + variação contra o mês anterior; pedir `months + 1` para a base da primeira variação; escala Menos/Mais dos blocos de Serviços por tipo; saldo tingido pelo sinal. `FinanceFlowChart` segue no Início.
4. Categorias: trocar o gráfico de barras por ranking com valor, parcela e barra proporcional (`ShareList`), total no cabeçalho do painel e alcance na descrição. Apagar `categories-chart.tsx`.
5. Gate: `pnpm run check`, build do web, teste de unidade da tabela. A conferência no navegador ficou para o usuário (sem credencial de dev na sessão).
