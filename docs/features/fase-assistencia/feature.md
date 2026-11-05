---
feature: Fases da Assistência técnica
slug: fase-assistencia
descricao: Assistência técnica com lista própria de fases do serviço, da proposta de honorários ao acordo ou desistência
data: 2026-11-04
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-186]
spec: [.specs/features/fase-assistencia]
branches: [main]
---

# Fases da Assistência técnica

**Status**: concluido · **Atualizado**: 2026-11-04 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='fase-assistencia'`.

## O que foi feito

- Com o tipo **Assistência técnica**, "Fase do serviço" mostra uma lista própria, sem grupos: as 12 fases da perita mais Proposta de honorários enviada, Honorários recebidos e Acordo / desistência. A perícia segue com a lista em grupos (`fase-servico`) e o tipo do escritório com as fases digitadas.
- A API recusa fase de uma lista no serviço do outro tipo; assistência nova começa em "Contratado"; trocar o tipo no formulário troca a fase quando a atual não serve.
- Encerram a assistência só Honorários recebidos e Acordo / desistência (e o status Cancelado). "Assistência finalizada" continua em aberto.
- "Laudos entregues" conta a assistência de "Parecer técnico entregue" em diante; concluir o parecer com a entrega leva a essa fase.
- Assistências já cadastradas com fase da perícia passaram para "Contratado" na subida da API (as de Honorários recebidos ficaram).
- Planilha: fase da assistência reconhecida pelo texto; fase da perícia numa assistência fica em branco e vai às observações com "(!)".
- Lista, filtro por fase, detalhe, ficha em PDF e gráfico do início (barra "Assistência técnica") com as fases novas.

## Por que

Pedido da perita (2026-11-04); escolhas dela em `.specs/features/fase-assistencia/spec.md`. Não desfazer sem ler a AD-186.

## Como

- `packages/contracts/src/schemas/case.schema.ts` — `TECHNICAL_ASSISTANCE_PHASES`, `casePhases`, `defaultPhase`, `validServiceType`, `CASE_CLOSED_PHASES`.
- `packages/db/src/models/case.model.ts` — conversão em `migrateCases`.
- `apps/api/src/modules/case/{case.service,case.repository,import.service}.ts`, `apps/api/src/modules/documents/{report.service,document.layout}.ts`.
- `apps/web/src/components/case-labels.ts`, `apps/web/src/routes/_private/expert-cases/@components/{case-phase-field,service-type-field}.tsx`, `apps/web/src/routes/_private/@components/cases-phase-chart.tsx`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case apps/api/src/modules/documents/report.router.e2e.test.ts packages/db/src/models/case.model.int.test.ts
```

- UAT: Serviços → Novo → Assistência técnica: a fase abre em "Contratado" com a lista nova; voltar para Perícia troca para a lista em grupos.

## Pendências

- [ ] Conferência visual no navegador (servidor de dados não estava rodando localmente em 2026-11-04).

## Histórico

- 2026-11-04 — Feature entregue a pedido da perita (AD-186).
