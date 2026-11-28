---
feature: Sugestões do Datajud no serviço e no financeiro
slug: sugestoes-datajud
descricao: Sugestão ao lado do dado, detalhe do lançamento, hora de cobrar e de encerrar e busca no tribunal pelo número
data: 2026-11-27
status: concluido
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-304, AD-305, AD-306, AD-309]
spec: [.specs/features/sugestoes-datajud]
---

# Sugestões do Datajud no serviço e no financeiro

**Status**: concluído · **Atualizado**: 2026-11-27 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. A intenção está em `.specs/features/sugestoes-datajud/` (spec, design e tasks).
> Correlação com o git: `git log --oneline -i --grep='sugestoes-datajud'`.

## O que foi feito

- T1: 14975, 14984 e 14985 (fim da suspensão na TPU) saíram da regra de suspensão e foram para a retomada; as duas regras na versão 2 (`packages/contracts/src/schemas/automation-rules.ts`). Antes, o fim da suspensão virava a sugestão errada "Suspenso".

## Por que

O Datajud só diz o que aconteceu no processo, em código (AD-304); a sugestão precisa aparecer onde está o dado que
ela muda, com caminho direto para o serviço ou o lançamento, e o cadastro pode aproveitar o que o tribunal já sabe.

## Como

- Regras: `packages/contracts/src/schemas/automation-rules.ts` (teste ao lado).
- Preencher pelo tribunal: `caseFillOf` e `courtDivisionName` em `automation-rules.ts`; criada em `apps/worker/src/jobs/court-refresh.ts`, aplicada em `apps/api/src/modules/notifications/notification.service.ts`.
- Busca pelo número: `apps/api/src/modules/automation/` (`lookupCourtProcess`, rota `/automation/court-lookup`).
- Botão de sugestão: `apps/web/src/components/suggestion-button.tsx` (usado em `expert-cases/details` e `finance/details`).
- Detalhe do lançamento: `apps/web/src/routes/_private/finance/details/index.tsx`.
- Busca no cadastro: `apps/web/src/routes/_private/expert-cases/@components/court-lookup-button.tsx`; lista do tribunal: `apps/web/src/routes/_private/expert-cases/details/@utils/court-movement-rows.ts`.
- Client do Datajud: `packages/datajud/` (API e worker; fixtures reais em `packages/datajud/src/fixtures/`), com data de ajuizamento (`filedAt`) e assuntos (`subjects`) gravados no `CourtProcess`. O resto do mapa está em `.specs/features/sugestoes-datajud/design.md`.

## Como testar

Testes listados em `.specs/features/sugestoes-datajud/validation.md`. Na tela: um serviço trabalhista acompanhado com sugestões pendentes mostra o botão roxo e rosa ao lado da situação, da fase e da vara e no cabeçalho; as notificações do tribunal têm o ícone "Abrir"; no cadastro, o ícone de busca ao lado do número preenche os campos vazios.

## Pendências

- [ ] Railway: pôr `DATAJUD_API_KEY` também no serviço da API (sem ela a busca pelo número responde `court_unavailable`) de `.specs/features/sugestoes-datajud/tasks.md`.
- [ ] Antes do deploy, apagar de novo os dados do Datajud em produção (roadmap).

## Histórico

- 2026-11-28 — T8 e T11: ícone "Abrir lançamento"/"Abrir serviço" nas notificações do tribunal (entrou no commit da sessão `notificacoes-processo-unico`, 470c67f); conferência na tela local (`validation.md`), que corrigiu a página de notificações em branco (`nativeButton={false}` no link) e o botão de busca espremendo o número (virou ícone com dica).
- 2026-11-28 — T10: lista No tribunal sem ruído (`courtMovementRows`: sem Decurso de Prazo, Publicação e Disponibilização do mesmo minuto numa linha, mesmo documento do dia agrupado com a quantidade) e selo "Gera aviso ou sugestão" nos movimentos de regra; página Regras com cobrar, encerrar, arquivado com honorário em aberto e preencher.
- 2026-11-28 — T9: "Buscar no tribunal" ao lado do número do processo no cadastro e na edição (`court-lookup-button.tsx`): preenche só os campos vazios (esfera, tribunal, vara, data de autuação, objeto) e avisa para conferir antes de salvar; sem o módulo, a oferta.
- 2026-11-28 — T7: página de detalhe do lançamento (`/finance/details?id=`, `GET /finance/entries/:id`): tipo, categoria, serviço com link, valor, vencimento, recebido, saldo e os recebimentos; editar pelo diálogo de sempre; a sugestão de recebimento fica no saldo e no cabeçalho. A linha da lista do Financeiro passa a abrir o detalhe (o diálogo de edição saiu da linha).
- 2026-11-28 — T6: botão de sugestão (`apps/web/src/components/suggestion-button.tsx`, borda animada roxa e rosa em `apps/web/src/index.css`, parada com "reduzir movimento") ao lado da situação, da fase e da vara no detalhe do serviço e no cabeçalho com o número de pendentes; só as que a pessoa pode decidir e que ainda cabem no serviço. Saiu a lista de sugestões da seção No tribunal (`SuggestionsList`). Divergência do design: no celular o botão do cabeçalho fica no próprio cabeçalho, não no menu "…".
- 2026-11-28 — T5: `GET /automation/court-lookup?processNumber=` (módulo + `expert_cases` `view`): usa a cópia do dia do `CourtProcess` ou chama o Datajud uma vez (110 s, sem novas tentativas) e grava a cópia; devolve esfera, tribunal, vara, data de autuação e objeto (assuntos). Erros `court_process_not_found` (404) e `court_unavailable` (503). `DATAJUD_API_KEY` e `DATAJUD_BASE_URL` voltam à API.
- 2026-11-27 — T4: hora de cobrar e de encerrar pelo estado do processo (AD-309), a cada consulta depois da linha de base: aviso `fees_collection` uma vez por serviço com receita em aberto; processo encerrado no tribunal sugere a fase de encerrar com honorário recebido ou avisa `fees_open_finished` com receita em aberto; sugestão de recebimento pendente segura os dois. O aviso e o recebimento levam o lançamento em aberto (`Transaction`). Leituras novas no `packages/db/src/workerReads.ts` (`incomeOfCases`, `hasPendingSuggestion`).
- 2026-11-27 — T3: sugestão "Preencher com os dados do tribunal" (`case_fill`, AD-309): em qualquer consulta que encontra o processo, se a vara ou a data de autuação (`docketingDate`) do serviço estão vazias, uma vez por serviço; aceitar grava só o que continua vazio. Vara em maiúsculas vira só a inicial maiúscula (`courtDivisionName`).
- 2026-11-27 — T2: client do Datajud movido de `apps/worker/src/datajud/` para `packages/datajud` (sem shim), nos três Dockerfiles e no mapa do `AGENTS.md`; lê `dataAjuizamento` e `assuntos`. Imagem do worker construída e importando o pacote.
- 2026-11-27 — T1b: suspensão pelas famílias 25, 11025 e 12274 e pelo arquivamento provisório (245); retomada por 14974 e filhos, 849 e 893 (regras na versão 3); `courtFinishing` (fim do processo pelo último movimento entre encerrar e retomar, baixa só no primeiro grau) e `CASE_FINISHED_RULE`. Divergência do design: a AD-310 (outra sessão, mesmo dia) trocou `assistance_closed` por `finished`, comum a todos os tipos; a assistência recebe "Finalizado" (`finished`) e a perícia segue "Honorários recebidos", como o usuário escolheu.
- 2026-11-27 — T1: códigos de fim da suspensão (14975, 14984, 14985) movidos da suspensão para a retomada; `case_suspended` e `case_resumed` na versão 2. `pnpm run check` verde (759 testes).
- 2026-11-27 — Design revisado antes do código (AD-309): encerrar e cobrar pelo estado do processo a cada consulta, não pelo movimento novo (a baixa definitiva do TRF3 vem seguida de reativação; a RPV do TRT24 é paga depois do arquivamento); "recebido" exige ao menos uma receita liquidada; suspensão inclui as famílias 11025 e 12274; preenchimento em qualquer consulta; o botão filtra as sugestões que já não cabem; T1 separada para ir antes.
- 2026-11-27 — Design e tasks. Divergências da spec: encerrar sugere "Honorários recebidos" na perícia e "Finalizado" na assistência (AD-306, escolha do usuário); a automação preenche só vara e data de ajuizamento (o objeto é obrigatório no serviço); "não encontrado" e "segredo de justiça" viram uma resposta só; sem honorário em aberto, "Abrir" leva ao serviço. O client do Datajud vai para `packages/datajud`, usado pela API e pelo worker.
- 2026-11-27 — Perita confirmou as 14 questões pela página `.specs/features/sugestoes-datajud/revisao-perita.html`; AD-304 ativa.
- 2026-11-27 — Spec a partir da descoberta de 2026-11-26 (`.specs/features/sugestoes-datajud/plans/2026-11-26-conteudo-dos-movimentos.md`).
