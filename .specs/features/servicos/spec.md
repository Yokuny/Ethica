# Serviços — Specification

**Origem**: pedido da perita (Tamires) em 2026-11-02, na tela `/expert-cases/add`.

## Problem Statement

A seção "Perícias" só cadastra processo judicial (número CNJ, tribunal, justiça e papel), mas a perita também presta serviços fora desse molde e quer enxergar o trabalho como **serviço**: tipo do serviço numa lista só, um status simples do andamento, se já foi pago e quanto, quanto gastou com ele e quanto sobra de honorário. A data da perícia hoje só entra pela agenda, à parte do cadastro.

## Goals

- [ ] A seção passa a se chamar "Serviços" na tela; o cadastro pergunta o tipo de serviço numa lista com tipos novos do escritório.
- [ ] Status do serviço (Proposta enviada, Em andamento, Entregue, Com pendência, Cancelado), ao lado das etapas atuais.
- [ ] Pagamento (Sim, Não, Parcial) e valor recebido, calculados pelos recebimentos já lançados.
- [ ] Despesas do serviço com categoria (incluindo categoria nova) e o honorário líquido descontando-as.
- [ ] Data, hora e local da perícia no cadastro, que viram compromisso de perícia na agenda.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Renomear `Case` no código, rotas e URLs | Só o texto da tela muda (AD-140: um termo por conceito no código). |
| Relatório financeiro por categoria nova de despesa | Categoria nova soma em "Outras despesas" nos totais; fica para depois. |
| Excluir ou renomear tipo de serviço/categoria nova | O tipo existe enquanto algum serviço/despesa o usa (AD-158, AD-159). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Status novo × 8 etapas | Os dois: status do serviço é campo próprio; etapas e fase continuam | Perita, 2026-11-02 | Yes |
| Pagamento | Automático pelos recebimentos do serviço | Perita, 2026-11-02 | Yes |
| Base do líquido | Honorário fixado (ou contratado); sem ele, o proposto; menos despesas não canceladas | Perita, 2026-11-02 | Yes |
| Tipo novo | Número do processo, tribunal e vara opcionais; nos tipos judiciais seguem obrigatórios | Perita, 2026-11-02 | Yes |
| Justiça federal | Continua na lista ("Perícia federal", "Assistência técnica federal") | Já existe no sistema e na prospecção | No |
| Data da perícia | Aparece no cadastro de qualquer tipo; compromisso de 1 hora | O assistente técnico também acompanha a perícia | No |

---

## Requirements

- **SRV-01** Texto da tela: "Perícias" (o registro) vira "Serviços"/"Serviço" no menu, títulos, listas e avisos. A palavra continua "perícia" onde é o ato (data da perícia, vistoria).
- **SRV-02** Tipo de serviço: uma lista com Perícia trabalhista, Perícia civil, Assistência técnica trabalhista, Assistência técnica civil, Perícia federal, Assistência técnica federal, os tipos novos já usados no escritório e "Cadastrar novo". Tipo novo pede nome e atuação (perito ou assistente técnico).
  1. WHEN o tipo é novo THEN número do processo, tribunal e vara SHALL ser opcionais; nos demais SHALL seguir obrigatórios.
  2. WHEN dois serviços sem número existem no mesmo escritório THEN the system SHALL aceitar os dois.
- **SRV-03** Status do serviço no cadastro, edição, detalhe e listagem; o padrão no cadastro é "Proposta enviada".
- **SRV-04** Pagamento no detalhe: "Não" sem recebimento; "Sim" quando o recebido alcança o honorário-base (ou, sem base, quando todo honorário lançado foi recebido); senão "Parcial"; mostra o valor recebido.
- **SRV-05** Despesas: lançar despesa no detalhe do serviço com categoria (Deslocamento, Equipamentos, Terceiros, Materiais, Taxas, Alimentação, categorias novas já usadas, "Cadastrar nova despesa"), valor e data. Honorário líquido = base − despesas não canceladas.
- **SRV-06** Data e hora da perícia e local (endereço completo ou coordenada "lat, long") no cadastro criam um compromisso do tipo perícia ligado ao serviço. Coordenada vai direto para o mapa do dia, sem busca de endereço.

## Design (inline)

- Contrato `packages/contracts/src/schemas/case.schema.ts`: `COURTTYPES` ganha `other` (tipo novo); `Case.serviceType` guarda o nome do tipo novo; `SERVICE_STATUS` + `Case.serviceStatus`; `inspection: { date, time, location? }` só no cadastro. `processNumber`/`court` opcionais com `courtType: 'other'` (refine no contrato). Índice único de número vira parcial (só quando existe) e o `Case` passa a `syncIndexes()` para trocar o índice antigo (AD-158).
- Tipos novos e categorias novas não têm coleção: a lista vem dos valores já gravados (`GET /cases/service-types`, `GET /finance/expense-names`).
- `Transaction.categoryName` (só despesa `other_expenses`). Categorias de despesa: `travel, equipment, third_parties, supplies, fees_and_taxes, food, other_expenses` (AD-159).
- Pagamento e líquido calculados no web a partir dos lançamentos do serviço (`transactionsQuery({ caseId })`), sem campo gravado.
- Data da perícia: `case.service` emite `case:inspection_scheduled`; o subscriber da agenda cria o compromisso (AD-039; `case` não depende de `agenda`). `appointment.service.geocode` lê coordenada digitada sem chamar o geocodificador (AD-160).
