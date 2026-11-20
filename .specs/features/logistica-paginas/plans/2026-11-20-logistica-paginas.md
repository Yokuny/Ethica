# 2026-11-20 — Logística em páginas por intenção e termo de vistoria assinado

Feature: `logistica-paginas` (spec, design e tasks em `.specs/features/logistica-paginas/`). Decisão: AD-239.

1. Entrega A (web): hub `/field`, intervalo de datas, `/field/map`, `/field/route`, `/field/inspections` e registro em `/field/inspections/details`; apaga `period.ts`, `view`, `field-map.tsx` e `/field/inspection`.
2. Entrega B (API + web): `GET /documents/inspections/:appointmentId` (PDF com tudo menos observações internas), aba Observações com as assinaturas de todos os presentes e pré-visualização; coleta sai de Presentes.
3. Registro: `feature.md` novo, histórico em `campo-vistorias`, roadmap, `pnpm docs:sync`.
