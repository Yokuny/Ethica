# Contatos das varas — Specification

**Origem**: pedido da perita em 2026-11-01 ("base de contatos das varas do trabalho e varas cíveis de todas as cidades por estado: filtra estado, cidade e aparecem os dados de contato"). Prefixo de requisito: `VAR`.

## Problem Statement

Para falar com a vara (secretaria, e-mail, telefone, balcão virtual) a perita procura no site de cada tribunal a cada vez. Não existe uma fonte oficial única com os contatos de todas as varas do país, e os dados mudam.

## Goals

- [ ] Uma agenda de varas do escritório, filtrável por estado, cidade e tipo (trabalho, cível).
- [ ] Cadastro rápido, inclusive por planilha, e acesso a partir da perícia.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Base nacional pronta, raspada dos sites dos tribunais | Escolha da perita: cadastro do escritório (2026-11-01, AD-151). |
| Varas federais e criminais | Não pedido; o tipo é uma lista que pode crescer. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Origem dos dados | Cadastro do escritório, começa vazio | Escolha da perita | Yes (2026-11-01) |
| Campos | Tipo (trabalho, cível), nome da vara, tribunal, estado, cidade, endereço, telefones, e-mail, balcão virtual (link), observações | O que a secretaria costuma divulgar | No |
| Importação | Planilha CSV com modelo para baixar, como a importação de processos (AD-118) | Mesmo padrão da casa | No |
| Ligação com a perícia | No detalhe da perícia, o contato da vara aparece quando vara e cidade batem com um cadastro | Evita procurar de novo | No |
| Quem edita | Admin e gestor; operador só consulta | Mesmo padrão de cadastro do escritório (AD-137) | No |

---

## User Stories

### P1: Agenda de varas ⭐ MVP — VAR-01

1. WHEN a perita abre "Varas" THEN the system SHALL listar as varas cadastradas com filtros de estado, cidade e tipo e busca por nome.
2. WHEN escolhe estado e cidade THEN the system SHALL mostrar as varas daquela cidade com telefone, e-mail, endereço e balcão virtual.
3. WHEN cadastra ou edita THEN the system SHALL validar e-mail, telefone e estado.

### P2: Importar planilha — VAR-02

1. WHEN envia a planilha THEN the system SHALL criar as varas novas, ignorar as já cadastradas (mesmo tribunal, cidade e nome) e relatar as recusadas com o motivo.

### P2: Contato da vara na perícia — VAR-03

1. WHEN a perícia tem vara e comarca que batem com um cadastro THEN the system SHALL mostrar o contato no detalhe da perícia.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VAR-01 | Agenda de varas | Specify | Pending |
| VAR-02 | Importar planilha | Specify | Pending |
| VAR-03 | Contato na perícia | Specify | Pending |

## Pontos de atenção para o design

- Termo novo no glossário antes do código (AD-140): vara → `CourtDivision` (já é `division` na perícia).
- Módulo dono provável: `case` (vara já é dado da perícia).
