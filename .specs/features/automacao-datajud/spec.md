# Automação Datajud (módulo premium) — Specification

**Origem**: plano `2026-11-22-automacao-datajud-notificacoes.md` (D2, D3, D5, D6, D7, seções 4, 5 e 9) e, como base técnica, `2026-11-22-prospeccao-worker-datajud.md` (D1, D3, D4, D6, D7, seções 4, 6 e 13), escolhidos pelo usuário em 2026-11-22. Depende de `central-notificacoes`. Prefixo de requisito: `ADT`.

## Problem Statement

A perita acompanha os processos dos serviços abrindo o tribunal à mão. Quando o processo é suspenso, acaba em acordo ou tem alvará expedido, ela só descobre tarde, às vezes depois de ir a uma vistoria de processo encerrado. O Datajud (CNJ) publica as movimentações, mas com defasagem, códigos que variam por tribunal e sem valor nem beneficiário em pagamento. O módulo transforma essas movimentações em **avisos** e, quando uma regra reconhece o movimento, em **sugestões** que a pessoa aprova ou rejeita.

## Goals

- [ ] Toda movimentação nova de um processo acompanhado vira um aviso na Central.
- [ ] Movimentos reconhecidos viram sugestões de status, fase, movimentação, recebimento ou prazos.
- [ ] **Nada muda nos dados sem a aprovação da pessoa**; a aprovação aplica pelo service dono, com as validações e os eventos da edição manual.
- [ ] O módulo é cobrado à parte (segunda assinatura no Asaas).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Busca de prospecção pelo worker, buscas salvas, painel por vara | Plano anterior; fica para depois deste. |
| Nomeações pelo DJEN | Plano anterior, seção 1A; fonte provável dos eventos do perito (esclarecimentos, impugnação). |
| Valor e beneficiário do pagamento | O Datajud não informa; a pessoa confirma (D3). |
| Datas de prazo vindas do tribunal | O Datajud não informa; a automação de prazos só revisa e cancela os existentes. |

---

## Assumptions & Open Questions

Padrões da seção 12 do plano; a confirmação fica no `docs/roadmap.md`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Arquivamento definitivo | Só aviso | Arquivamento não diz se houve acordo ou sentença | No |
| Quem aprova sugestão financeira | Quem tem `finance` `update` | Quem altera o dado aprova a mudança dele (D5) | No |
| Alvará: e-mail na hora ou no consolidado | Na hora (`critical`) | É dinheiro a receber | No |
| Frequência da atualização no tribunal | 1×/dia | Defasagem do Datajud de T+1 a T+7 | No |
| O que o premium inclui | D2: acompanhamento, linha do tempo, avisos de movimentação e sugestões | A Central, os lembretes e o push são do plano base | No |
| Preço do premium | **Do usuário** | — | No |
| "Expedição de alvará eletrônico automatizado": texto exato e origem (PJe, diário oficial ou Datajud) | **Pergunta ao usuário.** No Datajud (TRT24) só existe o movimento 60 "Expedição de documento" com o complemento `tipo_de_documento` 73 "Alvará", sem "eletrônico" nem "automatizado" | Define o gatilho único de pagamento (D3); a regra fica desligada até a resposta | No |
| Processos só de TRT | A confirmar na Fase 4: TJ e TRF recusaram toda consulta em 2026-11-22 | Sem fixture de TJ e TRF, os códigos deles não estão validados | No |

---

## User Stories

### P1: Assinatura do módulo — ADT-01 (Fase 3)

1. WHEN o admin assina a Automação Datajud em `/billing` THEN the system SHALL criar uma segunda assinatura no Asaas, separada da do plano.
2. WHEN o pagamento é confirmado pelo webhook THEN the system SHALL estender `Tenant.automationUntil`.
3. WHEN o módulo está vencido ou nunca foi assinado THEN the system SHALL responder 403 `automation_required` nas rotas do módulo e mostrar a oferta na Central e no serviço.
4. WHEN faltam 7 dias para vencer THEN the system SHALL avisar o admin (`automation_expiring`).
5. WHEN o módulo vence THEN the system SHALL parar o acompanhamento, marcar as sugestões pendentes como `expired` e manter a linha do tempo até a última atualização, com a data.

### P1: Acompanhamento no tribunal — ADT-02 (Fase 4)

1. WHEN o escritório tem o módulo THEN the system SHALL acompanhar todo serviço com `processNumber` válido, papel judicial e não encerrado, uma vez por dia.
2. WHEN um serviço é sincronizado pela primeira vez (ou o módulo é reativado) THEN the system SHALL gravar a linha de base e não gerar aviso.
3. WHEN aparece movimentação nova THEN the system SHALL gerar um aviso `court_movement` agrupado por serviço e por execução.
4. WHEN o escritório não tem o módulo THEN the system SHALL não consultar o Datajud por ele.
5. WHEN abro o serviço THEN the system SHALL mostrar a seção "No tribunal" com a linha do tempo.
6. WHEN o processo é sigiloso (`nivelSigilo > 0`) THEN the system SHALL descartá-lo sem gravar nem logar dados dele.

### P1: Sugestões de serviço — ADT-03 (Fase 5)

1. WHEN uma regra reconhece suspensão, retomada, acordo, desistência ou extinção, sentença ou encerramento da instrução THEN the system SHALL criar uma sugestão de status ou fase, com a evidência do movimento.
2. WHEN aprovo THEN the system SHALL aplicar pelo `caseService` (agenda e eventos reagem como na edição manual) e marcar `accepted`.
3. WHEN o serviço já está no estado proposto THEN the system SHALL marcar `superseded`; WHEN a transição ficou impossível THEN 409 `suggestion_outdated`.
4. WHEN aprovo duas vezes THEN the system SHALL aplicar uma vez só.
5. WHEN rejeito THEN the system SHALL guardar o motivo.

### P1: Sugestões financeiras e de prazos — ADT-04 (Fase 6)

1. WHEN há homologação, liberação ou "aprovado" de valores THEN the system SHALL gerar só o aviso "Pagamento em andamento no tribunal", sem sugerir pagamento.
2. WHEN há expedição de alvará (gatilho confirmado pelo usuário) THEN the system SHALL sugerir "Registrar recebimento", e a parcela só é gravada com valor, data e conta confirmados pela pessoa; a sugestão avisa que o alvará pode ser de outra parte.
3. WHEN a parcela excede o saldo THEN the system SHALL recusar com `parcel_exceeds_balance`.
4. WHEN o processo acaba em acordo ou extinção aprovados THEN the system SHALL sugerir cancelar os prazos e alertas pendentes do serviço.
5. WHEN o processo é suspenso THEN the system SHALL avisar para revisar os prazos pendentes.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ADT-01 | Assinatura do módulo | Fase 3 | Pending |
| ADT-02 | Acompanhamento no tribunal | Fase 4 | Pending (porta: fixtures de TJ/TRF ou "só TRT" confirmado) |
| ADT-03 | Sugestões de serviço | Fase 5 | Pending |
| ADT-04 | Sugestões financeiras e de prazos | Fase 6 | Pending (regra do alvará desligada até o usuário confirmar o gatilho) |

## Success Criteria

- [ ] Nenhum dado de serviço, financeiro ou prazo muda sem um clique de aprovação.
- [ ] A perita fica sabendo de um acordo no processo antes da vistoria.
- [ ] "Aprovado" e homologação nunca sugerem pagamento.
