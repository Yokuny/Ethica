# Tipo de serviço próprio — Specification

**Origem**: pedido da perita em 2026-11-03, na tela `/expert-cases/add` ("Tipo de serviço" → "Cadastrar novo").

## Problem Statement

O tipo de serviço criado pelo escritório (AD-158) usa o mesmo formulário da perícia judicial: número do processo, tribunal, vara, data da nomeação, prazo do laudo e os status da rotina judicial. Para um serviço contratado direto por um cliente esses campos não fazem sentido; faltam os dados de quem contratou, um status do jeito do serviço e o registro do pagamento já no cadastro.

## Goals

- [ ] Tipo próprio mostra **Dados do contratante** no lugar de número do processo, tribunal, vara e comarca.
- [ ] Atuação e status abertos: escolher entre os já usados ou digitar um novo.
- [ ] "Data da contratação" e "Data de entrega" no lugar de "Data da nomeação" e "Prazo do laudo".
- [ ] Honorário contratado e pagamento (Sim, Não, Parcial, valor recebido e data da quitação) no cadastro.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Excluir ou renomear status/atuação digitados | Existem enquanto algum serviço os usa (mesma regra do tipo, AD-158). |
| Converter os status dos serviços de tipo próprio já cadastrados | Eles continuam válidos e aparecem na lista até serem trocados. |
| Pagamento pelo formulário de edição | Depois do cadastro o recebimento é lançado no painel Financeiro do serviço, como hoje. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Dados do contratante | Nome/razão social (obrigatório), CPF/CNPJ, telefone, e-mail, endereço | Perita, 2026-11-03 | Yes |
| Status do tipo próprio | Escolher entre os já usados no tipo, "Concluído", "Cancelado" ou digitar novo | Perita, 2026-11-03 | Yes |
| Quando encerra | Só "Concluído" e "Cancelado" encerram; os digitados contam como em aberto | Perita, 2026-11-03 | Yes |
| Atuação | Perito do juízo, Assistente técnico, as já digitadas ou digitar nova | Perita, 2026-11-03 | Yes |
| Data de entrega | Vira o prazo "Entrega do serviço" com aviso, como o prazo do laudo | Perita, 2026-11-03 | Yes |
| Demais blocos | Pagamento recebido (Sim/Não/Parcial), valor recebido (repete o honorário no Sim), data da quitação; sem data da perícia, partes, honorário proposto e comarca | Perita, 2026-11-03 | Yes |
| Quem vê o pagamento | Só quem vê o financeiro (admin e gerente) | AD-107/AD-137 | No |

## Requirements

- **TSP-01** — No cadastro com tipo próprio (novo ou já criado), a seção "Processo" vira "Dados do contratante": nome/razão social (obrigatório no cadastro), CPF/CNPJ, telefone, e-mail e endereço. Número do processo, tribunal, vara e comarca somem do formulário.
- **TSP-02** — Atuação: lista com Perito do juízo, Assistente técnico, as atuações já digitadas e "Cadastrar nova" (texto livre). O tipo já criado traz a atuação dele.
- **TSP-03** — Status: no tipo próprio, a lista traz os status já usados naquele tipo, "Concluído", "Cancelado" e "Cadastrar novo status" (texto livre). Nos seis tipos judiciais a lista continua a de hoje.
- **TSP-04** — Serviço com status digitado conta como em aberto (listas, painéis, avisos de parado); só Concluído e Cancelado o encerram.
- **TSP-05** — "Data da nomeação" vira "Data da contratação" e "Prazo do laudo" vira "Data de entrega" no tipo próprio; a data de entrega cria o prazo "Entrega do serviço" (agenda e aviso diário).
- **TSP-06** — No cadastro do tipo próprio: honorário contratado, pagamento recebido (Sim, Não, Parcial), valor recebido (no Sim repete o honorário; no Parcial é digitado) e data da quitação. O honorário vira receita a receber no financeiro e o valor recebido vira recebimento nessa receita, na data da quitação.
- **TSP-07** — Detalhe e lista do serviço mostram o contratante, a atuação e o status digitados.
