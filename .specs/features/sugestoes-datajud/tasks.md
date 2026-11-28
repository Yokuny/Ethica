# Sugestões do Datajud no serviço e no financeiro — Tasks

Design: `.specs/features/sugestoes-datajud/design.md`. Um commit por task, direto na `main` (AD-143), escopo
`sugestoes-datajud`. Gate de cada task: `pnpm run check`; com o web tocado, também `(cd apps/web && pnpm run build)`.
Antes de cada task, `git pull --ff-only` e reler `CASE_CLOSED_PHASES` e `casePhases` (outra sessão mexe em fases).

| # | Task | Design | Gate extra |
| --- | --- | --- | --- |
| T1 | Correção já em produção: 14975, 14984 e 14985 saem da suspensão e vão para a retomada; versões 2 | D1 | `pnpm vitest run --project unit automation-rules` |
| T1b | Regras pela TPU completas: famílias 25, 11025 e 12274 + 245 na suspensão; 14974 e filhos, 849 e 893 na retomada; `isCourtFinished` | D1 | idem |
| T2 | `packages/datajud`: mover client, fixtures e testes do worker; `filedAt` e `subjects` no `parseAnswer` e no `CourtProcess`; worker importa do pacote; Dockerfiles, tsconfig, vitest e mapa do `AGENTS.md` | D5 | `pnpm vitest run --project unit datajud` + `docker build -f Dockerfile.worker .` |
| T3 | `case_fill`: proposta, `proposalFits`, `apply` só nos vazios; worker cria a sugestão em qualquer consulta que encontra o processo, uma vez por serviço (vara e ajuizamento) | D2 | `pnpm vitest run --project integration court-refresh` |
| T4 | Receita no worker (`incomeOf`): avisos `fees_collection` e `fees_open_finished` e sugestão `case_finished` pelo estado do processo; `transactionId` no recebimento | D1, D3 | integração do worker |
| T5 | `GET /automation/court-lookup` com chave na API, cópia do dia, tempo limite e as duas chaves de erro | D5, D6 | e2e da automação |
| T6 | Botão de sugestão (componente, animação, reduzir movimento) no detalhe do serviço: situação, fase, tribunal e cabeçalho; sai o `SuggestionsList` da seção No tribunal | D7 | teste de tela + build |
| T7 | Detalhe do lançamento: `GET /finance/entries/:id`, página `finance/details`, linha da lista abre o detalhe, botão de sugestão na parcela e no cabeçalho | D7, D8 | e2e do financeiro + build |
| T8 | Botão "Abrir" nas notificações (lançamento ou serviço) | D9 | build |
| T9 | "Buscar no tribunal" no formulário do serviço, com a oferta sem o módulo | D6 | build |
| T10 | Lista No tribunal sem ruído e com selo nos movimentos de regra; página Regras com as regras novas | D1, D10 | unidade `court-movement-rows` + build |
| T11 | Conferência no banco local (regras repetindo movimentos reais pelo `seenMovementKeys`) e no navegador local (sugestões, lançamento, busca, lista); limite do proxy da Railway para a busca de até 110 s; `validation.md`, `feature.md`, roadmap; apagar de novo os dados do Datajud em produção antes do deploy | — | `pnpm docs:sync` |

T1 corrige um erro que já está em produção (fim da suspensão sugerindo "Suspenso") e pode ir sozinha, antes das demais.
