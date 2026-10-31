# Prazos e recebimentos — Specification

**Origem**: onda 1 da gap analysis `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (inventário §2.4, §3, §5.2, §16).

## Problem Statement

O perito convive com vários prazos por processo (laudo, quesitos suplementares, esclarecimentos, impugnações), mas o Ethica guarda só o `prazoLaudo` da perícia e um compromisso automático (AD-106). Não há como registrar que um prazo foi protocolado, nem em que data, nem que foi perdido. No financeiro, o honorário fixado é um lançamento único: adiantamentos e alvarás parciais, que são a regra na Justiça do Trabalho, viram lançamentos soltos (roadmap #4), e o saldo a receber se perde. Os compromissos não saem do Ethica para a agenda que o perito usa no celular, e nada avisa o perito antes de um prazo vencer.

## Goals

- [ ] Vários prazos por perícia, cada um com título, vencimento, status (pendente, protocolado, perdido) e data de protocolo.
- [ ] Recebimentos parciais de um honorário, com saldo, status parcial e estorno de parcela.
- [ ] Agenda e prazos assináveis no Google Agenda, Outlook ou Apple Calendar por um link iCal secreto.
- [ ] Aviso por e-mail de prazo próximo e vencido, sem depender de o perito abrir o Ethica.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Cálculo de prazo em dias úteis/feriados forenses | Exige calendário por tribunal; o prazo continua sendo informado como data. |
| Sincronização bidirecional com calendários externos | O feed é só leitura; edição continua no Ethica. |
| Notificação por WhatsApp/push | E-mail usa o `MailProvider` existente; outros canais ficam para depois. |
| Pagamento parcial de despesa | Valor baixo para o perito (gap analysis ★). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Prazo é entidade própria ou compromisso da agenda | **Pendente de decisão (vira AD)** — proposta: entidade `Prazo` no módulo `pericia`, mostrada também no calendário | Prazo tem semântica de protocolo (entregue/perdido) que compromisso não tem; AD-106 hoje cria compromisso | No |
| O `prazoLaudo` da perícia | Passa a criar o prazo "Entrega do laudo" em vez do compromisso | Mantém o comportamento automático observado nos dois produtos | No |
| Parcelas de recebimento | Ficam dentro do lançamento de receita (lista de parcelas); status `parcial` derivado | Um honorário, várias entradas; o relatório de fluxo de caixa usa a data da parcela | No |
| Janela do aviso por e-mail | 15 dias antes, no dia e no dia seguinte ao vencimento, 07:00 de São Paulo | "Vence em breve" = 15 dias (usuário, 2026-10-31) | Yes (limiar) |
| Quem recebe o aviso | Usuários `admin` e `manager` do tenant | Operador não vê financeiro (AD-107), mas prazo é operacional — confirmar | No |

---

## User Stories

### P1: Controlar todos os prazos de uma perícia ⭐ MVP

**User Story**: Como perito, quero cadastrar cada prazo do processo e marcar quando protocolei, para não perder nenhum e provar que cumpri.

**Acceptance Criteria**:

1. WHEN o perito adiciona um prazo com título e vencimento THEN the system SHALL salvá-lo como `pendente` na perícia.
2. WHEN o perito registra o protocolo com uma data THEN the system SHALL marcar o prazo como `protocolado` e guardar a data.
3. WHEN o perito marca um prazo como `perdido` THEN the system SHALL mantê-lo no histórico sem contá-lo como pendente.
4. WHEN a perícia é cadastrada com prazo do laudo THEN the system SHALL criar o prazo "Entrega do laudo" pendente.
5. WHEN a listagem de perícias é exibida THEN the system SHALL mostrar o próximo prazo pendente e destacar como "vence em breve" os que vencem em até 15 dias e os vencidos (limiar definido pelo usuário em 2026-10-31).
6. WHEN o calendário da agenda é exibido THEN the system SHALL mostrar os prazos pendentes no dia do vencimento.

**Independent Test**: Cadastrar dois prazos, protocolar um, marcar outro como perdido e ver a listagem, o detalhe e o calendário.

### P1: Receber honorários em parcelas ⭐ MVP

**User Story**: Como perito, quero lançar cada valor que cai na conta contra o honorário fixado, para saber quanto ainda falta receber.

**Acceptance Criteria**:

1. WHEN uma parcela é registrada com valor e data THEN the system SHALL somá-la ao recebido e mostrar o saldo do honorário.
2. WHEN o recebido é menor que o valor do honorário THEN the system SHALL exibir o status `parcial`; WHEN alcança o valor THEN `liquidado`.
3. WHEN uma parcela é estornada THEN the system SHALL removê-la do recebido e recalcular saldo e status.
4. WHEN uma parcela excederia o saldo THEN the system SHALL recusar com mensagem clara.
5. WHEN o fluxo de caixa é calculado THEN the system SHALL usar a data de cada parcela, não o vencimento do honorário.

**Independent Test**: Honorário de R$ 4.800,00, parcela de R$ 1.500,00 (parcial, saldo R$ 3.300,00), estorno (volta a previsto), quitação (liquidado).

### P2: Ver os compromissos e prazos na agenda do celular

**User Story**: Como perito, quero assinar minha agenda do Ethica no Google Agenda, para ver vistorias e prazos sem abrir o sistema.

**Acceptance Criteria**:

1. WHEN o usuário gera o link de sincronização THEN the system SHALL mostrar uma URL iCal secreta, por usuário e tenant.
2. WHEN o calendário externo consulta a URL THEN the system SHALL responder `text/calendar` com compromissos e prazos pendentes do tenant.
3. WHEN o usuário revoga o link THEN the system SHALL invalidar a URL anterior.

**Independent Test**: Assinar a URL num calendário e ver a vistoria e o prazo aparecerem.

### P2: Ser avisado de prazos por e-mail

**User Story**: Como perito, quero receber e-mail antes de um prazo vencer e quando ele vence sem protocolo.

**Acceptance Criteria**:

1. WHEN um prazo pendente está a 15 dias, no dia ou 1 dia vencido THEN the system SHALL enviar um e-mail diário consolidado aos destinatários do tenant.
2. WHEN o prazo é protocolado THEN the system SHALL parar de avisar.
3. WHEN o tenant desliga os avisos THEN the system SHALL não enviar.

---

## Edge Cases

- Prazo com vencimento no passado no cadastro SHALL ser aceito (prazo já vencido).
- Excluir perícia SHALL excluir seus prazos.
- Honorário com parcelas não SHALL ser excluído sem estornar as parcelas (ou a exclusão leva as parcelas — decidir no design).
- Tenant suspenso (AD-098) SHALL não receber e-mail nem servir o feed iCal.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PRZ-01 | P1: Controlar todos os prazos | Specify | Pending |
| PRZ-02 | P1: Receber honorários em parcelas | Specify | Pending |
| PRZ-03 | P2: Agenda no celular (iCal) | Specify | Pending |
| PRZ-04 | P2: Aviso de prazos por e-mail | Specify | Pending |

## Success Criteria

- [ ] Nenhum prazo do processo fica fora do Ethica; o protocolo tem data registrada.
- [ ] O saldo a receber de cada honorário bate com as parcelas lançadas.
- [ ] O perito vê vistorias e prazos no calendário do celular.
