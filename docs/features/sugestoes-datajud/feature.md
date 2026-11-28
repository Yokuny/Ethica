---
feature: Sugestões do Datajud no serviço e no financeiro
slug: sugestoes-datajud
descricao: Sugestão ao lado do dado, detalhe do lançamento, hora de cobrar e de encerrar e busca no tribunal pelo número
data: 2026-11-27
status: parcial
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-304, AD-305, AD-306, AD-309]
spec: [.specs/features/sugestoes-datajud]
---

# Sugestões do Datajud no serviço e no financeiro

**Status**: parcial · **Atualizado**: 2026-11-27 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`

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
- Client do Datajud: `packages/datajud/` (API e worker; fixtures reais em `packages/datajud/src/fixtures/`), com data de ajuizamento (`filedAt`) e assuntos (`subjects`) gravados no `CourtProcess`. O resto do mapa está em `.specs/features/sugestoes-datajud/design.md`.

## Como testar

A definir (task T11).

## Pendências

- [ ] Tasks T4 a T11 de `.specs/features/sugestoes-datajud/tasks.md`.
- [ ] Antes do deploy, apagar de novo os dados do Datajud em produção (roadmap).

## Histórico

- 2026-11-27 — T3: sugestão "Preencher com os dados do tribunal" (`case_fill`, AD-309): em qualquer consulta que encontra o processo, se a vara ou a data de autuação (`docketingDate`) do serviço estão vazias, uma vez por serviço; aceitar grava só o que continua vazio. Vara em maiúsculas vira só a inicial maiúscula (`courtDivisionName`).
- 2026-11-27 — T2: client do Datajud movido de `apps/worker/src/datajud/` para `packages/datajud` (sem shim), nos três Dockerfiles e no mapa do `AGENTS.md`; lê `dataAjuizamento` e `assuntos`. Imagem do worker construída e importando o pacote.
- 2026-11-27 — T1b: suspensão pelas famílias 25, 11025 e 12274 e pelo arquivamento provisório (245); retomada por 14974 e filhos, 849 e 893 (regras na versão 3); `courtFinishing` (fim do processo pelo último movimento entre encerrar e retomar, baixa só no primeiro grau) e `CASE_FINISHED_RULE`. Divergência do design: a AD-310 (outra sessão, mesmo dia) trocou `assistance_closed` por `finished`, comum a todos os tipos; a assistência recebe "Finalizado" (`finished`) e a perícia segue "Honorários recebidos", como o usuário escolheu.
- 2026-11-27 — T1: códigos de fim da suspensão (14975, 14984, 14985) movidos da suspensão para a retomada; `case_suspended` e `case_resumed` na versão 2. `pnpm run check` verde (759 testes).
- 2026-11-27 — Design revisado antes do código (AD-309): encerrar e cobrar pelo estado do processo a cada consulta, não pelo movimento novo (a baixa definitiva do TRF3 vem seguida de reativação; a RPV do TRT24 é paga depois do arquivamento); "recebido" exige ao menos uma receita liquidada; suspensão inclui as famílias 11025 e 12274; preenchimento em qualquer consulta; o botão filtra as sugestões que já não cabem; T1 separada para ir antes.
- 2026-11-27 — Design e tasks. Divergências da spec: encerrar sugere "Honorários recebidos" na perícia e "Finalizado" na assistência (AD-306, escolha do usuário); a automação preenche só vara e data de ajuizamento (o objeto é obrigatório no serviço); "não encontrado" e "segredo de justiça" viram uma resposta só; sem honorário em aberto, "Abrir" leva ao serviço. O client do Datajud vai para `packages/datajud`, usado pela API e pelo worker.
- 2026-11-27 — Perita confirmou as 14 questões pela página `.specs/features/sugestoes-datajud/revisao-perita.html`; AD-304 ativa.
- 2026-11-27 — Spec a partir da descoberta de 2026-11-26 (`.specs/features/sugestoes-datajud/plans/2026-11-26-conteudo-dos-movimentos.md`).
