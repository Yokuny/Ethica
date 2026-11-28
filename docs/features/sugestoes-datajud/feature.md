---
feature: Sugestões do Datajud no serviço e no financeiro
slug: sugestoes-datajud
descricao: Sugestão ao lado do dado, detalhe do lançamento, hora de cobrar e de encerrar e busca no tribunal pelo número
data: 2026-11-27
status: planejado
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-304, AD-305, AD-306]
spec: [.specs/features/sugestoes-datajud]
---

# Sugestões do Datajud no serviço e no financeiro

**Status**: planejado · **Atualizado**: 2026-11-27 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. A intenção está em `.specs/features/sugestoes-datajud/` (spec, design e tasks).
> Correlação com o git: `git log --oneline -i --grep='sugestoes-datajud'`.

## O que foi feito

Nada no código ainda. Spec confirmada pela perita, design e tasks (T1 a T11) prontos.

## Por que

O Datajud só diz o que aconteceu no processo, em código (AD-304); a sugestão precisa aparecer onde está o dado que
ela muda, com caminho direto para o serviço ou o lançamento, e o cadastro pode aproveitar o que o tribunal já sabe.

## Como

A definir na implementação; o mapa de arquivos está em `.specs/features/sugestoes-datajud/design.md`.

## Como testar

A definir (task T11).

## Pendências

- [ ] T1: corrigir a regra de suspensão (14975, 14984 e 14985 são de retomada na TPU) — já em produção.
- [ ] Tasks T2 a T11 de `.specs/features/sugestoes-datajud/tasks.md`.
- [ ] Antes do deploy, apagar de novo os dados do Datajud em produção (roadmap).

## Histórico

- 2026-11-27 — Design e tasks. Divergências da spec: encerrar sugere "Honorários recebidos" na perícia e "Finalizado" na assistência (AD-306, escolha do usuário); a automação preenche só vara e data de ajuizamento (o objeto é obrigatório no serviço); "não encontrado" e "segredo de justiça" viram uma resposta só; sem honorário em aberto, "Abrir" leva ao serviço. O client do Datajud vai para `packages/datajud`, usado pela API e pelo worker.
- 2026-11-27 — Perita confirmou as 14 questões pela página `.specs/features/sugestoes-datajud/revisao-perita.html`; AD-304 ativa.
- 2026-11-27 — Spec a partir da descoberta de 2026-11-26 (`.specs/features/sugestoes-datajud/plans/2026-11-26-conteudo-dos-movimentos.md`).
