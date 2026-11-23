# Notificações num processo só — Tasks

Gate: `pnpm run check` verde e `(cd apps/web && pnpm run build)`; registro (`STATE.md` AD-282, `feature.md`, roadmap, `pnpm docs:sync`); um commit, push.

- [x] T1 Contrato: `NotificationRecord`, `DatedNotificationRecord`, `NOTIFICATION_STATES`.
- [x] T2 API: `GET /notifications` único e `GET /notifications/count`; saem `/notices`, `/unread-count`, `/suggestions` e as funções que só eles usavam; e2e reescrito (abertas/resolvidas, visibilidade por módulo para quem não vê o financeiro, ordem, contador, sugestões e aviso lido por pessoa).
- [x] T3 Web: query única; página sem abas aninhadas; item "Avisos" do menu sai e o contador vai para Notificações; detalhe do serviço, agenda, Automação e testes religados.
- [x] T4 Aceite: `rg -n "noticesQuery|suggestionsQuery|unreadNoticesQuery|/notices|unread-count|/suggestions|view: 'notices'" apps packages` vazio; chaves de tradução sem uso removidas; gate; conferência no navegador.
