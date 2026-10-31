# Base de documentos (identidade do escritório e PDFs) — Specification

**Origem**: onda 3 da gap analysis `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (inventário §6, §9, §10). Pré-requisito do laudo automatizado (`.specs/features/laudos/spec.md`).

## Problem Statement

O perito precisa levar papel para a vistoria (checklist), entregar relatórios ao escritório e ao contador e arquivar a situação de cada processo, mas o Ethica não gera nenhum documento. Também não guarda a identidade do escritório (logo, cabeçalho e rodapé) nem os dados profissionais do perito (CPF, registro CREA/CRM/MTE, formação) que vão em todo documento técnico. Sem exportação dos dados, o escritório não cumpre um pedido de portabilidade (LGPD).

## Goals

- [ ] Configuração da identidade do escritório e dos dados profissionais de cada usuário.
- [ ] Geração de PDF no servidor com a identidade do escritório: ficha da perícia, checklist de campo, cronograma de prazos, relatório financeiro e relatório de perícias paradas.
- [ ] Exportação de todos os dados do tenant em um ZIP de CSVs.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Laudo pericial | Feature própria (`laudos`), que reaproveita esta base. |
| Assinatura digital (ICP-Brasil) | Protocolo é feito no PJe pelo perito. |
| Relatório de produtividade de campo | Depende do registro de vistoria (onda 5). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como gerar PDF | HTML→PDF com Chromium headless no `apps/api` (AD-119) | HTML reaproveita o editor do laudo e o cabeçalho rico; headless pesa na imagem Docker | Yes |
| Onde guardar o logo | Storage S3 compatível, cota de 1 GB por tenant (AD-120) | Um único lugar para arquivos do tenant | Yes |
| Cabeçalho e rodapé | Texto simples de várias linhas com marcadores `[LOGO]`, `[NOME_PERITO]`, `[PAGINA_ATUAL]`, `[TOTAL_PAGINAS]` (AD-121) | Editor rico fica para o laudo | Yes |
| Quem gera relatório financeiro | Só `admin` e `manager` (AD-107, AD-121) | Coerente com o acesso ao financeiro | Yes |
| "Perícia parada" | Perícia aberta há mais de 60 dias sem **movimentação**, que é: carregamento (entrega) do laudo, notificação de recebimento de honorários, intimação para prestar esclarecimentos ou para laudo complementar | Definido pelo usuário em 2026-10-31; o modelo precisa registrar esses eventos com data | Yes |

---

## User Stories

### P1: Identidade do escritório e dados profissionais ⭐ MVP

**Acceptance Criteria**:

1. WHEN o admin envia o logo (PNG/JPG até o limite) THEN the system SHALL guardá-lo e usá-lo nos documentos.
2. WHEN o admin edita cabeçalho e rodapé THEN the system SHALL aplicá-los a todos os PDFs com os marcadores substituídos.
3. WHEN o usuário edita sua conta THEN the system SHALL permitir CPF, registro profissional e formação.

### P1: Ficha da perícia e checklist de campo ⭐ MVP

**Acceptance Criteria**:

1. WHEN o usuário pede a ficha de uma perícia THEN the system SHALL gerar PDF com dados do processo, partes, prazos com status, compromissos e, para `admin`/`manager`, o resumo financeiro.
2. WHEN o usuário pede o checklist de campo THEN the system SHALL gerar PDF com cabeçalho do processo, participantes com espaço para assinatura, mapeamento de agentes (ruído, calor/frio/umidade, químicos, biológicos, periculosidade) com Sim/Não e observações, matriz de divergências (reclamante × reclamada × constatação), documentos solicitados e anotações.

### P2: Relatórios gerenciais em PDF

**Acceptance Criteria**:

1. WHEN o usuário gera o cronograma de prazos THEN the system SHALL listar prazos pendentes por vencimento com "faltam N dias" e destaque "vence em breve" para até 15 dias.
2. WHEN `admin`/`manager` gera o relatório financeiro de um período THEN the system SHALL mostrar recebido, pago, saldo realizado, a receber, a pagar e saldo previsto, com as tabelas de cada grupo.
3. WHEN o usuário gera o relatório de perícias paradas THEN the system SHALL listar as perícias abertas sem movimentação (entrega do laudo, recebimento de honorários, intimação para esclarecimentos ou laudo complementar) há mais de 60 dias, com os dias parados.

### P2: Exportar todos os dados

**Acceptance Criteria**:

1. WHEN o admin pede a exportação THEN the system SHALL gerar um ZIP com um CSV por entidade do tenant (perícias, partes, compromissos, prazos, lançamentos, usuários sem senha, oportunidades).
2. WHEN a exportação é gerada THEN the system SHALL registrar quem e quando.

---

## Edge Cases

- Perícia sem partes ou prazos SHALL gerar ficha com as seções vazias identificadas.
- Logo ausente SHALL remover o marcador `[LOGO]` sem quebrar o layout.
- Operador SHALL não ver valores financeiros em nenhum PDF (AD-107).

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DOC-01 | P1: Identidade e dados profissionais | Specify | Pending |
| DOC-02 | P1: Ficha e checklist | Specify | Pending |
| DOC-03 | P2: Relatórios gerenciais | Specify | Pending |
| DOC-04 | P2: Exportar todos os dados | Specify | Pending |

## Success Criteria

- [ ] O perito imprime o checklist da vistoria pelo Ethica.
- [ ] Todo PDF sai com logo, cabeçalho e rodapé do escritório.
