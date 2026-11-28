# Sugestões do Datajud no serviço e no financeiro — Tasks

Design: `.specs/features/sugestoes-datajud/design.md`. Um commit por task, direto na `main` (AD-143), escopo
`sugestoes-datajud`. Gate de cada task: `pnpm run check`; com o web tocado, também `(cd apps/web && pnpm run build)`.
Antes de cada task, `git pull --ff-only` e reler `CASE_CLOSED_PHASES` e `casePhases` (outra sessão mexe em fases).

| # | Task | Design | Gate extra |
| --- | --- | --- | --- |
| T1 | Regras pela TPU: suspensão completa + 245, retomada com 14974 e filhos, 849 e 893; tirar 14975/14984/14985 da suspensão; versões 2; testes das regras | D1 | `pnpm vitest run --project unit automation-rules` |
| T2 | `packages/datajud`: mover client, fixtures e testes do worker; `filedAt` e `subjects` no `parseAnswer` e no `CourtProcess`; worker importa do pacote | D5 | `pnpm vitest run --project unit datajud` |
| T3 | `case_fill`: proposta, `proposalFits`, `apply` só nos vazios; worker cria a sugestão na linha de base (vara e ajuizamento) | D2 | `pnpm vitest run --project integration court-refresh` |
| T4 | Honorário em aberto no worker (`openIncomeOf`): avisos `fees_collection` e `fees_open_finished`, regra `case_finished`, `transactionId` no recebimento; encadeamento recebimento → encerrar na API | D1, D3, D4 | integração do worker + e2e de notificações |
| T5 | `GET /automation/court-lookup` com chave na API, cópia do dia, tempo limite e as duas chaves de erro | D5, D6 | e2e da automação |
| T6 | Botão de sugestão (componente, animação, reduzir movimento) no detalhe do serviço: situação, fase, tribunal e cabeçalho; sai o `SuggestionsList` da seção No tribunal | D7 | teste de tela + build |
| T7 | Detalhe do lançamento: `GET /finance/entries/:id`, página `finance/details`, linha da lista abre o detalhe, botão de sugestão na parcela e no cabeçalho | D7, D8 | e2e do financeiro + build |
| T8 | Botão "Abrir" nas notificações (lançamento ou serviço) | D9 | build |
| T9 | "Buscar no tribunal" no formulário do serviço, com a oferta sem o módulo | D6 | build |
| T10 | Lista No tribunal sem ruído e com selo nos movimentos de regra; página Regras com as regras novas | D1, D10 | unidade `court-movement-rows` + build |
| T11 | Conferência no navegador local (sugestões, lançamento, busca, lista), `validation.md`, `feature.md`, roadmap; apagar de novo os dados do Datajud em produção antes do deploy | — | `pnpm docs:sync` |

T1 corrige um erro que já está em produção (fim da suspensão sugerindo "Suspenso") e pode ir antes das demais.
