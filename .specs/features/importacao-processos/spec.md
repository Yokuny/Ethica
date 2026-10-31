# Importação de processos por PDF e CSV — Specification

**Origem**: onda 2 da gap analysis `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (inventário §2.2, §2.6, §2.7, §8), com ajuste do usuário em 2026-10-31: **sem** a importação assistida por IA externa (copiar prompt e colar JSON); a importação é **por PDF e por CSV**.

## Problem Statement

Cadastrar uma perícia exige ler a ata de audiência ou o despacho de nomeação e redigitar número, vara, comarca, objeto, partes, advogados e prazos. Quem tem dezenas de processos não consegue migrar para o Ethica sem digitar um por um. Além disso, a perícia guarda autor e réu como texto livre e não guarda os dados que o laudo trabalhista usa (autuação, admissão, demissão, período imprescrito, função do reclamante, endereço do local periciado).

## Goals

- [ ] Criar uma perícia a partir do PDF da ata/despacho, com revisão dos campos antes de salvar.
- [ ] Importar muitas perícias de uma vez por CSV a partir de um modelo baixável.
- [ ] Partes e advogados como cadastros reutilizáveis, ligados à perícia.
- [ ] Dados auxiliares do laudo trabalhista na perícia.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Importação por IA externa colando prompt/JSON | Descartada pelo usuário em 2026-10-31. |
| Busca automática do processo no PJe | Sem API pública; o Datajud já cobre metadados na prospecção (AD-105). |
| PDF escaneado sem camada de texto (OCR) | **Não confirmado** — depende da decisão de extração (abaixo). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como extrair dados do PDF | **Pendente de decisão (vira AD)**: (a) regras/regex sobre o texto do PDF (número CNJ, vara, datas por padrões de linguagem) ou (b) extração por modelo de IA no servidor | O usuário vetou a IA *colada*; não está definido se IA no servidor é aceitável (custo e LGPD) | No |
| Revisão antes de salvar | Sempre: o PDF preenche o formulário de cadastro, o perito confere e salva | Extração nunca é 100%; evita perícia errada | No |
| Número CNJ do PDF | Validado pelo `numeroProcessoSchema` e pela unicidade por tenant | Mantém a vantagem sobre o concorrente (aceita DV errado) | No |
| Separador e codificação do CSV | `;` e UTF-8 com BOM, datas `DD/MM/AAAA` ou `AAAA-MM-DD` | Compatível com Excel em pt-BR | No |
| Linha inválida no CSV | Importa as válidas e devolve relatório por linha (número da linha, motivo) | Lote grande não pode falhar inteiro por uma linha | No |
| Partes já cadastradas | Reaproveita por documento (CPF/CNPJ) e, sem documento, por nome exato | Evita duplicar a mesma reclamada em vários processos | No |
| Período imprescrito | Calculado quando há autuação: início = mais recente entre (autuação − 5 anos) e admissão; fim = demissão | Regra trabalhista observada no concorrente | No |

---

## User Stories

### P1: Cadastrar perícia a partir do PDF ⭐ MVP

**User Story**: Como perito, quero enviar o PDF da ata ou do despacho e receber o cadastro preenchido, para só conferir e salvar.

**Acceptance Criteria**:

1. WHEN o perito envia um PDF THEN the system SHALL extrair número do processo, vara, comarca, objeto, partes, advogados, data de nomeação e prazo do laudo quando presentes, e abrir o formulário de cadastro preenchido.
2. WHEN um campo não é encontrado THEN the system SHALL deixá-lo vazio e sinalizá-lo para preenchimento.
3. WHEN o número extraído é inválido THEN the system SHALL avisar antes de salvar; WHEN já existe no tenant THEN the system SHALL avisar e não criar duplicado.
4. WHEN o perito salva THEN the system SHALL criar a perícia e as partes/advogados ainda não cadastrados.
5. WHEN o arquivo não é PDF ou excede o limite de tamanho THEN the system SHALL recusar com mensagem clara.

**Independent Test**: Enviar o PDF de uma ata trabalhista e conferir os campos preenchidos.

### P1: Importar perícias em lote por CSV ⭐ MVP

**User Story**: Como perito que está migrando, quero subir uma planilha com todos os meus processos.

**Acceptance Criteria**:

1. WHEN o usuário baixa o modelo THEN the system SHALL entregar um CSV com as colunas aceitas e uma linha de exemplo.
2. WHEN o CSV é enviado THEN the system SHALL criar uma perícia por linha válida e responder quantas foram criadas, ignoradas e recusadas, com o motivo por linha. Processo já cadastrado no tenant SHALL ser pulado sem interromper o lote, apenas com um aviso (usuário, 2026-10-31).
3. WHEN uma linha traz partes ou advogados THEN the system SHALL reaproveitar cadastros existentes ou criá-los.

**Independent Test**: CSV com 3 linhas válidas, 1 duplicada e 1 com número inválido ⇒ 3 criadas, 1 ignorada, 1 recusada.

### P2: Partes e advogados reutilizáveis

**User Story**: Como equipe do escritório, quero cadastrar a reclamada uma vez e escolhê-la em outros processos.

**Acceptance Criteria**:

1. WHEN o usuário cadastra uma parte THEN the system SHALL guardar nome, CPF/CNPJ, e-mail e telefone; advogado guarda nome, OAB, e-mail e telefone.
2. WHEN o usuário edita a perícia THEN the system SHALL permitir escolher ou criar na hora autor, réu e os advogados de cada lado.
3. WHEN o usuário abre uma parte THEN the system SHALL listar as perícias em que ela aparece.

### P2: Dados auxiliares do laudo trabalhista

**Acceptance Criteria**:

1. WHEN a justiça é trabalhista THEN the system SHALL permitir data de autuação, admissão, demissão, função do reclamante, período imprescrito e endereço do local periciado.
2. WHEN há autuação, admissão e o período imprescrito está vazio THEN the system SHALL sugerir o período calculado.

---

## Edge Cases

- PDF com vários processos (pauta) SHALL usar o primeiro número encontrado e avisar.
- CSV vazio ou sem cabeçalho SHALL ser recusado.
- Datas impossíveis (31/02) SHALL recusar a linha, não o arquivo.
- Migração: as perícias existentes com `autor`/`reu` em texto livre SHALL ser convertidas em cadastros de parte (decidir no design).

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IMP-01 | P1: Cadastrar perícia a partir do PDF | Specify | Pending |
| IMP-02 | P1: Importar em lote por CSV | Specify | Pending |
| IMP-03 | P2: Partes e advogados reutilizáveis | Specify | Pending |
| IMP-04 | P2: Dados auxiliares do laudo trabalhista | Specify | Pending |

## Success Criteria

- [ ] Cadastrar uma perícia a partir do PDF leva menos de 1 minuto, contando a revisão.
- [ ] Um escritório migra 100 processos com um CSV.
