# Filtros das listas — spec

**Data**: 2026-11-11 · **Pedido**: perita (design de lista com busca e marcação enviado no chat)

## Problema

Nas listas com vários filtros (Serviços, Varas, Diário de bordo) o botão "Filtros" abre uma coluna de seletores
empilhados, longa e feia. As listas com um filtro só (Partes) já estão boas e não mudam.

## Requisitos

- **FIL-01** "Filtros" abre uma lista curta com o nome de cada filtro; o que está aplicado mostra o valor (uma opção)
  ou a quantidade (várias) ao lado.
- **FIL-02** Clicar num filtro troca a lista pelas opções dele: seta para voltar, busca quando a lista é longa,
  caixa de marcar em cada opção e "Limpar".
- **FIL-03** Cada filtro de opções aceita **várias** opções; a lista mostra o que bate com qualquer uma delas.
  Serviços: fase, status, esfera, tipo. Varas: UF, cidade (das UFs marcadas), esfera. Diário: pessoa, módulo, ação.
- **FIL-04** Filtros que não são opções (número de controle, períodos) abrem seus campos no mesmo passo.
- **FIL-05** O número no botão "Filtros" conta os filtros aplicados.

## Decisões com a perita

| Pergunta | Resposta |
| --- | --- |
| Como "Filtros" abre | lista de filtros, um clique no nome abre as opções, seta para voltar |
| Várias opções por filtro | sim |
