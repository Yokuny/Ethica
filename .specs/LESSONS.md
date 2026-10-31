# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — Teste de agregação por período precisa de um registro fora do período; com dados só do período atual, remover o filtro de data passa despercebido.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `financeiro, aggregation` · harmful: 0
- features: prazos-recebimentos
- evidence: M7 apps/api/src/modules/financeiro/lancamento.repository.ts (resumo, filtro parcelas.data do mês) (financeiro, aggregation)
- last seen: 2026-10-31T13:51:53Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
