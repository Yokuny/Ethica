# Notificações num processo só — Spec

**Pedido do usuário (2026-11-23)**: a página Notificações vira uma página só, sem aba dentro de aba ("Prazos e Alertas / Avisos / Para aprovar" e, dentro da primeira, "Pendente / Protocolado / Perdido / Concluído / Cancelado"); o back-end fica um módulo só de notificações, simplificado; tudo vira **um processo único**, não um agrupamento de coisas diferentes.

## O processo

Toda notificação (prazo, alerta, sugestão, aviso — AD-263) segue o mesmo ciclo:

1. **Aberta** — pede a atenção de alguém: prazo ou alerta pendente, sugestão pendente, aviso que a pessoa ainda não leu.
2. **Resolvida** — a pessoa agiu: protocolou, perdeu, concluiu ou cancelou o prazo/alerta; aprovou ou rejeitou a sugestão (ou ela foi superada/expirou); leu o aviso.

Cada notificação tem **uma data**: o vencimento do prazo ou alerta; o dia do movimento no tribunal da sugestão; o dia em que o aviso nasceu.

## Requirements

| ID | Requisito |
| --- | --- |
| NPU-01 | Uma lista só com todas as notificações que a pessoa pode ver, filtrada por **Abertas** (padrão) ou **Resolvidas** — um único controle, sem abas aninhadas. |
| NPU-02 | Abertas pela data, da mais antiga para a mais nova (o atrasado no topo, as sugestões na ordem do tribunal — AD-268); resolvidas da mais recente para a mais antiga. |
| NPU-03 | Cada linha mostra data, o que é (título + tipo), o serviço com o contratante e a situação; resolver é na própria notificação: o prazo/alerta abre o diálogo de sempre (protocolar, adiar, concluir, cancelar…), a sugestão tem Aprovar/Rejeitar, o aviso tem Marcar como lido. |
| NPU-04 | Quem vê o quê segue uma regra só: os módulos que a pessoa pode ver (`expert_cases`, `finance`, D5/AD-137). |
| NPU-05 | O menu tem um item só, **Notificações**, com o número das abertas que já chegaram ao dia (vencidas ou de hoje, sugestões e avisos não lidos); o item "Avisos" separado sai. |
| NPU-06 | A API tem uma leitura só (`GET /notifications`) e um contador só (`GET /notifications/count`); saem `/notices`, `/unread-count` e `/suggestions`. |

## Assumptions & Open Questions

| # | Decisão tomada sem perguntar | Por quê |
| --- | --- | --- |
| 1 | Aviso continua lido **por pessoa** (o aviso que eu li continua aberto para a colega). | Não perde o que existia (AD-263). |
| 2 | "Marcar todos como lidos" continua, como ação da página quando há avisos abertos. | Com dezenas de avisos do worker, um a um seria pior. |
| 3 | As cinco abas de situação viram Abertas/Resolvidas; a situação exata aparece no selo da linha. Supersede a AD-193. | Pedido do usuário (sem aba dentro de aba). |
| 4 | O contador do menu conta só o que já chegou ao dia, não todo prazo futuro. | Senão o número fica sempre alto e perde o sentido de "olhe agora". |
| 5 | O modelo do banco e as situações não mudam; aberta/resolvida é derivada. | Worker, agenda, iCal, exportação e e-mail do dia dependem deles. |

## Design (inline)

- `packages/contracts/src/schemas/notification.schema.ts`: `NotificationRecord` (forma única devolvida pela API, usada pelo web sem espelho), `DatedNotificationRecord` e `NOTIFICATION_STATES = ['open','resolved']`.
- `apps/api/src/modules/notifications/`: `GET /` com `state`, `kind`, `caseId`, `page`, `limit`, sempre pelos módulos visíveis; a data de ordenação é calculada no banco (`dueDate` ou o dia de `evidence.movement.at`/`createdAt` no fuso de exibição). `GET /count`. Escritas sem mudança: `POST /`, `PATCH /:id`, `DELETE /:id` (só prazo e alerta), `POST /:id/read`, `POST /read-all`, `POST /:id/accept|reject` (AD-268 intacta). Leituras internas (`listPending`, `listForExport`, `listCaseNotifications`, `fileReportDelivery`) continuam só prazo e alerta.
- `apps/web`: uma query `notificationsQuery({state, kind, caseId, page, limit})` e `notificationCountQuery`; página `/notifications` com um `Tabs` de linha Abertas/Resolvidas e uma tabela; o detalhe do serviço lê `?caseId=` uma vez e separa prazos/alertas e sugestões; a Automação conta as sugestões abertas por `total`.
