# Hierarquia tipográfica do Dashboard

**Pedido** (2026-11-28): melhorar a hierarquia visual do Dashboard; o detalhe do serviço e Relatórios têm mais
contraste nas fontes. Criar a skill `dashboard-design` (texto colado pelo usuário) para apoiar.

## Diagnóstico

- O contraste das páginas de referência vem do **salto de tamanho e peso**, não de cinza mais escuro: caption em
  caixa alta sobre valor `text-2xl` semibold `text-impact` (detalhe) e título `text-2xl/3xl font-semibold` (Relatórios).
- No Dashboard quase tudo tem 14–16px: títulos de seção em `text-base font-medium` ao lado da descrição de 14px,
  totais das legendas e centro das roscas em `font-medium` 14–16px herdando `--foreground`, valor dos KPIs em
  `font-normal`.
- O texto do ritmo da meta usa a cor do indicador (`--status-warning-indicator`, cerca de 2,9:1 sobre o fundo).

## Passos

1. Títulos das seis seções do Dashboard: `text-xl font-semibold tracking-tight text-impact`.
2. `RecordStats variant="band"` (Dashboard, Início, Serviços): rótulo em caption de caixa alta, como a faixa do
   detalhe; valor `text-2xl` semibold `text-impact`. Conferir que cinco células seguem numa linha (AD-300).
3. Totais das legendas (`CashFlowChart`, `RevenueGoalChart`) em `text-lg text-impact`; centro da rosca em
   `text-lg font-semibold text-impact` e valor da legenda em `text-impact`.
4. Texto do ritmo da meta (`GoalProgress`) nos tons `--status-*-foreground`; a barra segue com o indicador.
5. Skill `.agents/skills/dashboard-design/SKILL.md` como veio (portátil, sem vínculo com o repo), symlink em
   `.claude/skills/` e linha na tabela de skills do `AGENTS.md`.

## Fora do escopo (decisões registradas que a skill colada contraria; ficam com o usuário)

- Barras no lugar da área empilhada da Entrada de serviços (AD-255 recusou barras; área translúcida pela AD-260).
- Rosca só até 3 partes (o projeto usa até 4 + "Demais", AD-256).
- Âmbar para o a receber (é roxo, "previsto", AD-255).
- Cartões brancos com borda e paleta em hex (desfeito em 2026-11-14; cores vêm de `apps/web/src/theme.css`).
