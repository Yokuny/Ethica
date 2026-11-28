---
feature: Notificações num processo só
slug: notificacoes-processo-unico
descricao: Prazos, alertas, sugestões e avisos numa lista só, abertas ou resolvidas, com uma leitura e um contador na API
data: 2026-11-28
status: concluido
areas: [apps/api, apps/web, packages/contracts, docs]
decisoes: [AD-282, AD-311]
spec: [.specs/features/notificacoes-processo-unico]
---

# Notificações num processo só

**Status**: concluido · **Atualizado**: 2026-11-28 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `docs`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='notificacoes-processo-unico'`.

## O que foi feito

- **Notificações** é uma lista só, com **Abertas** (padrão) e **Resolvidas**: prazos, alertas, sugestões do Datajud e avisos juntos, pela data de cada um (o atrasado no topo). Saíram as abas Prazos e Alertas / Avisos / Para aprovar e as cinco abas de situação; a situação exata aparece no selo da linha.
- Resolver é na própria linha: o prazo ou alerta abre o diálogo de sempre (protocolar, adiar, concluir, cancelar…), a sugestão tem Aprovar/Rejeitar, o aviso tem Marcar como lido, em ícones com o texto no tooltip. Aviso é lido um por vez (sem "Marcar todos como lidos", AD-311).
- **Filtros** na barra da lista, como em Serviços: **Tipo** (prazo, alerta, sugestão, aviso; vários de uma vez) e **Período** da data de cada notificação; sem resultado, "Limpar filtros".
- Colunas: data, notificação, serviço (com o contratante), tipo de serviço e situação.
- O item **Avisos** do menu saiu; **Notificações** aparece no menu para todos (cada um vê só os módulos que pode ver) e o número fica nele, e conta o que já chegou ao dia (prazo ou alerta vencido ou de hoje, sugestão pendente, aviso não lido).
- API: uma leitura (`GET /notifications`, com `state`, `kind` repetível, `caseId`, `from`/`to`) e um contador (`GET /notifications/count`); saíram `/notices`, `/unread-count` e `/suggestions`. Quem vê o quê segue uma regra só: os módulos que a pessoa pode ver.
- Detalhe do serviço ("Prazos" e as sugestões em "No tribunal"), agenda e Automação Datajud leem a mesma lista.

## Por que

Pedido do usuário (2026-11-23): sem aba dentro de aba, um módulo só no back-end, um processo único. Não desfazer sem ler a AD-282.

## Como

- `packages/contracts/src/schemas/notification.schema.ts` — `NotificationRecord` (forma única dos quatro tipos), `DatedNotificationRecord`, `isDatedNotification`, `NOTIFICATION_STATES`.
- `apps/api/src/modules/notifications/notification.repository.ts` — `list` (uma agregação: filtro de aberta/resolvida, data calculada no fuso de exibição, página e total) e `countDue`; escritas e leituras internas (agenda, documentos) sem mudança.
- `apps/web/src/query/notification.ts` — `notificationsQuery`, `caseNotificationsQuery` (prazos e alertas do serviço), `notificationCountQuery`, `markReadMutation`.
- `apps/web/src/routes/_private/notifications/` — página e tabela; `apps/web/src/components/notification-labels.ts` (`notificationText`: o texto de qualquer tipo) e `suggestions-list.tsx` (`SuggestionActions`).

## Como testar

```
pnpm vitest run apps/api/src/modules/notifications apps/web/src/routes/_private/automation apps/web/src/components/notification-dialog.unit.test.tsx
```

- Falhas: `describe('falhas (AD-282)')` no e2e da API e `notificationText com dados incompletos` em `apps/web/src/components/notification-labels.unit.test.ts`.
- UAT: Notificações → Abertas mostra prazos, sugestões e avisos juntos; Marcar como lido num aviso baixa o número do menu e o leva para Resolvidas.

## Pendências

- [ ] Perita: confirmar a tabela "Assumptions" da spec (contador do menu, Abertas/Resolvidas no lugar das cinco situações).

## Histórico

- 2026-11-28 — Sai o "Marcar todos como lidos" (botão, `POST /notifications/read-all`, `markAllRead`; `markRead` exige o `id`) (AD-311). Coluna de ação em ícones com tooltip (`SuggestionActions` com `icons` em `apps/web/src/components/suggestions-list.tsx`) e coluna Serviço com o contratante em uma linha e os nomes no tooltip (`CaseCell` em `apps/web/src/routes/_private/notifications/@components/notifications-table.tsx`). Sem conferência na tela: o login local pede passkey.
- 2026-11-23 — Testes de falha: data ilegível do tribunal derrubava a lista inteira (500 para todos) e agora entra pelo dia em que a notificação nasceu (`$convert` com `onError` na agregação e a mesma regra no `dayOf`); duas aprovações ao mesmo tempo aplicam uma vez só; banco fora devolve `internal_error` sem detalhe; entrada inválida para na borda (400); quem não vê nenhum módulo recebe lista vazia; aviso de serviço excluído aparece sem os dados do serviço; texto de aviso ou sugestão incompleto diz o tipo em vez de "Aviso". Volume medido à parte (20 mil notificações num escritório): lista em ~90 ms, contador em ~25 ms, sem índice novo.

- 2026-11-23 — Filtros Tipo e Período na lista (pedido do usuário), conferidos no navegador; a coluna Tipo de serviço volta (pedido da perita de 2026-11-05); Notificações no menu também para quem só vê o Financeiro; o detalhe do serviço pede só prazos e alertas (`kind` repetível), para nenhum ficar fora do limite de 100; sugestões do mesmo dia na ordem do movimento.

- 2026-11-23 — Conferido no navegador local: lista aberta com prazos e avisos, aviso marcado como lido (menu de 50 para 49) e Resolvidas com Cancelado, Lido, Aprovada e Protocolado.
- 2026-11-23 — Entrega: página, API, contrato e consumidores num commit só (AD-282).

## Referências

- Spec (congelada): `.specs/features/notificacoes-processo-unico/`
