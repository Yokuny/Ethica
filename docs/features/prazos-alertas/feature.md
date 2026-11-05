---
feature: Prazos e Alertas
slug: prazos-alertas
descricao: Seção com os prazos e alertas de todos os serviços por criticidade; alerta é lembrete que se conclui
data: 2026-11-04
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-189]
spec: [.specs/features/prazos-alertas]
branches: [main]
---

# Prazos e Alertas

**Status**: parcial · **Atualizado**: 2026-11-04 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='prazos-alertas'`.

## O que foi feito

- Item **Prazos e Alertas** no menu, logo abaixo de Serviços (mesmo acesso de Serviços), também no início.
- Lista dos prazos e alertas de todos os serviços: abre com os **pendentes**, o vencimento mais próximo no topo (os vencidos primeiro), com o serviço, Prazo/Alerta e os selos Vencido / Vence em breve; o filtro de situação mostra Protocolado, Perdido e Concluído (do mais recente ao mais antigo).
- **Alerta** é um lembrete com data que se marca como concluído; **prazo** continua protocolado ou perdido. O servidor recusa a situação do outro tipo (`invalid_deadline_status`). Os prazos já cadastrados ficaram prazos.
- "Adicionar" escolhe o serviço e abre o mesmo formulário do detalhe do serviço, que agora pergunta Prazo ou Alerta.
- Alertas aparecem na agenda, no aviso diário por e-mail e nos números de prazos vencidos / que vencem em até 15 dias, como os prazos. A entrega do laudo nunca protocola um alerta.

## Por que

Pedido da perita (2026-11-04); escolhas dela em `.specs/features/prazos-alertas/spec.md`. Não desfazer sem ler a AD-189.

## Como

- `packages/contracts/src/schemas/deadline.schema.ts` — `DEADLINE_KINDS`, status `done`, `validDeadlineStatus`; `calendar-entry.schema.ts` (concluído na agenda).
- `packages/db/src/models/deadline.model.ts` — `kind` (padrão `deadline`).
- `apps/api/src/modules/case/deadline.{schema,repository,service,controller}.ts` + `case.router.ts` — `GET /expert-cases/deadlines`.
- `apps/web/src/routes/_private/deadlines/` — página, tabela e "Adicionar"; `apps/web/src/components/{deadline-dialog,deadline-form,deadline-labels,case-picker}.tsx`, `apps/web/src/hooks/useDeadlineForm.ts` (formulário e escolha do serviço passaram a ser compartilhados).

## Como testar

```
pnpm vitest run apps/api/src/modules/case/deadline.router.e2e.test.ts
```

- UAT: Prazos e Alertas → Adicionar → escolher o serviço → Alerta; conferir a ordem da lista, marcar o alerta como concluído e achá-lo no filtro Concluído.

## Pendências

- [ ] Tipos de prazo e alerta por tipo de serviço (perícia, assistência técnica, parceria) na lista suspensa do título, com texto livre (PAL-05): aguardando a perita aprovar as sugestões.
- [ ] Conferência visual no navegador (servidor de dados não estava rodando localmente em 2026-11-04).

## Histórico

- 2026-11-04 — Seção, lista por criticidade e alerta concluível entregues (AD-189); tipos sugeridos enviados para aprovação.
