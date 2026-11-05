---
feature: Prazos e Alertas
slug: prazos-alertas
descricao: Seção com os prazos e alertas de todos os serviços por criticidade; alerta é lembrete que se conclui
data: 2026-11-05
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-189, AD-190, AD-192, AD-193]
spec: [.specs/features/prazos-alertas]
branches: [main]
---

# Prazos e Alertas

**Status**: concluido · **Atualizado**: 2026-11-05 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='prazos-alertas'`.

## O que foi feito

- Item **Prazos e Alertas** no menu, logo abaixo de Serviços (mesmo acesso de Serviços), também no início.
- Lista dos prazos e alertas de todos os serviços: abre com os **pendentes**, o vencimento mais próximo no topo (os vencidos primeiro), com o serviço, o contratante (na perícia, autor e réu, como na lista de Serviços), o tipo de serviço, Prazo/Alerta e o selo de criticidade; o filtro de situação mostra Protocolado, Perdido e Concluído (do mais recente ao mais antigo).
- **Alerta** é um lembrete com data que se marca como concluído; **prazo** continua protocolado ou perdido. O servidor recusa a situação do outro tipo (`invalid_deadline_status`). Os prazos já cadastrados ficaram prazos.
- "Adicionar" escolhe o serviço e abre o mesmo formulário do detalhe do serviço, que agora pergunta Prazo ou Alerta.
- **Adiar**: prazo ou alerta pendente ganha o botão Adiar, que pede o novo vencimento (só depois do atual) e vale na seção, no detalhe do serviço e na agenda, para quem pode alterar serviços. A agenda e o aviso diário seguem a nova data; a data antiga não fica guardada.
- Selos de criticidade: Atrasado, Urgente (até 5 dias), Vence em breve (6 a 10), Atenção (11 a 30); depois de 30 dias, sem selo. Valem na seção (o selo traz o nome da criticidade; sem ela, a situação), no detalhe do serviço e na coluna Próximo prazo (selo colorido acima da data).
- Novo prazo ou alerta: lista suspensa com os títulos aprovados do tipo do serviço (perícia, assistência técnica, Parceria), que já marca Prazo ou Alerta, e "Escrever outro". A escolha do serviço busca e mostra o número de controle.
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

- [x] Conferência visual no navegador (2026-11-05, com os dados de demonstração).

## Histórico

- 2026-11-05 — Botão Adiar no prazo ou alerta pendente; colunas Contratante e Tipo de serviço na lista. O resumo do serviço passa a dar o contratante também dos tipos com contratante próprio, o que o faz aparecer no Financeiro; a agenda atualiza ao mudar um prazo.
- 2026-11-05 — A situação volta às abas acima da lista, abrindo em Pendentes (AD-193).
- 2026-11-05 — A situação sai do seletor solto e vai para o botão "Filtros" da lista (AD-192).
- 2026-11-04 — Selos de criticidade ganham o ponto colorido (`BadgeIndicator`) para a cor ficar mais forte, nas quatro telas.
- 2026-11-04 — Selo da seção passa a escrever a criticidade (Urgente, Atenção…) em vez de "Pendente"; coluna Próximo prazo mostra a criticidade como selo colorido.
- 2026-11-04 — Selos de criticidade, títulos aprovados por tipo de serviço e busca pela OS na escolha do serviço (AD-190).
- 2026-11-04 — Seção, lista por criticidade e alerta concluível entregues (AD-189); tipos sugeridos enviados para aprovação.
