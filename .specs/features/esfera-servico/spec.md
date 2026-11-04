# Esfera e tipo de serviço — Specification

**Origem**: pedido da perita em 2026-11-03 (Serviços: filtro, data em branco, cadastro).

## Problem Statement

O tipo de serviço misturava esfera e atuação ("Perícia trabalhista", "Assistência técnica civil"…). A perita quer escolher a **esfera** (trabalhista, civil, federal, extrajudicial) à parte do **tipo** (perícia, assistência técnica, parceria, os tipos do escritório e cadastrar novo), filtrar a lista por eles e por período, e poder apagar uma data já escolhida.

## Requirements

- **ESF-01** — Cadastro: campo **Esfera** (Trabalhista, Civil, Federal, Extrajudicial, obrigatória) e **Tipo de serviço** (Perícia, Assistência técnica, Parceria, tipos do escritório, Cadastrar novo).
- **ESF-02** — Parceria usa o formulário do tipo novo (contratante, status aberto, data da contratação e de entrega, pagamento).
- **ESF-03** — Perícia e Assistência técnica exigem processo e tribunal e não aceitam a esfera Extrajudicial.
- **ESF-04** — Filtros da lista: Esfera, Tipo de serviço (inclui os tipos do escritório) e **período de entrega**, com aviso de qual data é usada.
- **ESF-05** — Toda data preenchida pode voltar a ficar em branco ("Limpar data"), e na edição isso apaga a data salva.

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Data do filtro de período | Data de entrega (prazo "Entrega do laudo"/"Entrega do serviço"), com observação na tela | Perita, 2026-11-03 | Yes |
| Parceria | Como tipo novo | Perita, 2026-11-03 | Yes |
| Esfera no tipo novo | Aparece, com a opção Extrajudicial | Perita, 2026-11-03 | Yes |
| Esfera obrigatória | Sim, em todo serviço | Extrajudicial cobre o que não é de tribunal | No |
| Filtro de tipo | Dois filtros: Esfera e Tipo | Perita, 2026-11-03 | Yes |
| Serviços antigos de tipo do escritório | Esfera Extrajudicial | Não havia esfera neles | No |
| Perícia/assistência extrajudicial | Não permitido (exigem processo) | Mantém o processo obrigatório no judicial | No |
