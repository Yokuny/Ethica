# Agenda por eventos — Specification

**Origem**: pedido em 2026-11-03, depois de `rotina-servico`.

## Problem Statement

A agenda só recebe a data da perícia no cadastro do serviço e lê os prazos direto do módulo de serviços; o financeiro não aparece. Cada nova origem de data exigiria mais uma leitura cruzada. O pedido é que cada parte do sistema avise a agenda por evento e que a agenda aceite vários tipos.

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que entra | Data da perícia (cadastro e edição), prazos, vencimentos do financeiro (honorários e despesas) e recebimentos parciais | Respostas de 2026-11-03 | Yes |
| Pago ou cancelado | Continua no dia, marcado (pago, cancelado; prazo protocolado ou perdido) | Resposta de 2026-11-03 | Yes |
| "Planilha" | É a agenda: aceita os vários tipos, com filtro por tipo | Resposta de 2026-11-03 | Yes |
| Quem vê o financeiro na agenda | Só quem vê o financeiro (AD-137) | Valores não vazam pela agenda | No |
| Feed iCal | Compromissos + prazos (como hoje); financeiro fica fora do calendário externo | O link do feed não carrega a matriz de permissões | No |

## Requirements

- **AEV-01** Evento único `agenda:entries_synced` (origem + lista de itens): a agenda substitui os itens daquela origem. Prazos e lançamentos (com os recebimentos) emitem a cada criação, alteração e exclusão; a data da perícia do serviço emite no cadastro e na edição.
- **AEV-02** A agenda guarda os itens de dia inteiro (`CalendarEntry`: prazo, honorário, despesa, recebimento) e mantém a perícia como compromisso com hora (um por serviço de origem, atualizado quando a data muda).
- **AEV-03** Tela da agenda: itens de dia inteiro com o tipo, o estado (aberto, pago/protocolado, perdido, cancelado) e o filtro por tipo; o financeiro só para quem vê o financeiro. Clicar no prazo abre o prazo; no financeiro, os lançamentos do serviço.
- **AEV-04** Edição do serviço com data, hora e local da perícia.
- **AEV-05** Itens já existentes (prazos e lançamentos) entram na agenda na primeira subida da API.

## Design (inline)

- Contrato `packages/contracts/src/schemas/calendar-entry.schema.ts`: tipos, estados, fontes e os mapeamentos puros `deadlineAgendaEntries` / `transactionAgendaEntries` (usados por quem emite e pelo preenchimento inicial).
- `packages/db`: `CalendarEntry` (dono `agenda`); `Appointment.origin` (fonte + id) para o compromisso vindo do serviço; `backfillCalendarEntries()` na subida, só com a coleção vazia.
- `apps/api`: `events/subscribers/agenda.subscriber.ts` trata `agenda:entries_synced` (itens com hora → compromisso; demais → `CalendarEntry`) e `case:deleted` (prazos do serviço). `GET /agenda/entries?from&to&type`. Sai `case:inspection_scheduled`.
- `apps/web`: a agenda troca `pendingDeadlinesQuery` por `calendarEntriesQuery`.
