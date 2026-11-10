# Custo de deslocamento — Specification

**Origem**: pedido da perita em 2026-11-09: "Inclua na sessão campo a opção de calcular custo de deslocamento, através da quilometragem total, média km/L do veículo utilizado, pedágios no trajeto, preço do combustível [...] Inclua também a opção de pesquisar restaurante, hotel, pousada, borracharia, oficina mecânica no trajeto." Com um bloco de referência (título central, cartão com campos e botão, opções em linhas com valor à direita).

## Goals

- [ ] **CDE-01** No mapa do Campo, abaixo das paradas, o bloco "Custo de deslocamento": quilometragem total (já preenchida com os km da rota do mapa, editável), média km/L do veículo, preço do combustível (R$/L) e pedágios (R$). "Incluir a volta" soma o retorno ao ponto de partida quando a rota parte da localização do aparelho.
- [ ] **CDE-02** Resultado: litros, combustível, pedágios, total e custo por km.
- [ ] **CDE-03** "Lançar como despesa" (quem pode lançar no Financeiro): em uma OS (um serviço da rota) ou dividido entre as OS escolhidas da rota, em partes iguais. Cada lançamento é uma despesa "Deslocamento" a pagar, com vencimento hoje e a descrição dos km e da divisão.
- [ ] **CDE-04** "Lugares no trajeto": escolher restaurante, hotel, pousada, borracharia ou oficina mecânica; o mapa marca os lugares até 2 km da rota (OpenStreetMap) e a lista mostra nome, endereço e atalhos para Google Maps e Waze.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Guardar os dados do veículo | Não escolhido pela perita (2026-11-09). |
| Pedágio calculado pela rota | Não há fonte aberta de tarifas; o valor é digitado. |
| Divisão com valores diferentes por OS | Partes iguais; o lançamento pode ser editado no Financeiro. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Origem dos km | Rota do mapa, editável | Perita, 2026-11-09 | Yes |
| Destino do custo | Despesa numa OS ou dividida entre várias OS da rota | Perita, 2026-11-09 | Yes |
| Lugares | Marcados no mapa do Campo (OpenStreetMap) | Perita, 2026-11-09 | Yes |
| Situação da despesa | A pagar, vencimento hoje | Ela marca paga no Financeiro | No |
| Divisão | Partes iguais; o centavo que sobra vai para a primeira | Simples | No |

## Acceptance

1. Com rota no mapa, o campo de km já vem com a distância; digitar km/L, preço e pedágio mostra combustível, total e custo por km.
2. Lançar dividido entre duas OS cria duas despesas "Deslocamento" com metade do total cada.
3. Escolher "Borracharia" marca no mapa e lista as borracharias perto da rota.
