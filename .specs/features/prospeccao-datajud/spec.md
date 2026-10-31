# Busca de processos no Datajud — Specification

## Problem Statement

A busca de prospecção usa a API Pública do Datajud, mas não expõe todos os critérios úteis: número CNJ, códigos de classe e órgão julgador e assuntos que indiquem perícias técnicas nos TRTs. Isso limita a identificação de processos específicos antes de salvá-los como oportunidades.

## Goals

- [ ] Permitir pesquisar por número CNJ, classe processual, código de órgão julgador e assuntos técnicos nos TRTs, além dos filtros textuais existentes.
- [ ] Manter resultados selecionados na lista paginada de oportunidades para análise e conversão em perícia.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Busca automática ou em segundo plano | A busca externa deve continuar explícita para respeitar cota e rate limit (AD-105). |
| Consulta por data de ajuizamento | Não foi solicitada e exige ampliar o modelo de filtros. |
| Filtros de assunto para perícia técnica | Disponíveis apenas para TRTs, com Insalubridade, Periculosidade e Acidente de trabalho selecionados por padrão. |
| Alterar a autenticação ou persistência de oportunidades | Já atendidas pela implementação existente e AD-105. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Combinação dos filtros | Todos os filtros preenchidos são combinados por AND. | Corresponde ao exemplo oficial com `bool.must` e permite restringir a busca. | No |
| Número CNJ | Aceitar entrada formatada ou sem máscara e consultar os 20 dígitos. | O índice armazena a numeração sem formatação. | No |
| Página de oportunidades | Continua exibindo apenas processos explicitamente salvos na busca Datajud. | Mantém o ciclo de seleção/persistência documentado em AD-105. | No |

**Open questions:** none — defaults acima orientam a implementação.

---

## User Stories

### P1: Encontrar processos com os filtros do Datajud

**User Story**: Como pessoa que prospecta nomeações, quero filtrar por número de processo, classe e órgão julgador para localizar processos relevantes.

**Why P1**: Esses critérios estão nos exemplos oficiais compartilhados e cobrem busca específica e busca por códigos.

**Acceptance Criteria**:

1. WHEN a pessoa informa número CNJ, classe ou código do órgão julgador THEN a API SHALL enviar os critérios preenchidos em `bool.must` ao índice do tribunal selecionado.
2. WHEN o número CNJ é informado com ou sem pontuação THEN the system SHALL consultar o campo `numeroProcesso` com os dígitos normalizados.
3. WHEN uma página adicional é solicitada THEN the system SHALL continuar com os mesmos filtros e o cursor `search_after` da resposta anterior.
4. WHEN nenhum filtro opcional é informado THEN the system SHALL continuar permitindo a busca atual por tribunal.

**Independent Test**: Informar cada filtro isoladamente e em combinação, executar a busca e observar que os resultados correspondem ao tribunal e filtros enviados.

### P1: Filtrar assuntos que podem gerar perícia técnica em processos trabalhistas

**User Story**: Como pessoa que prospecta nomeações trabalhistas, quero selecionar assuntos técnicos para restringir a busca a processos que possam exigir perícia.

**Acceptance Criteria**:

1. WHEN a pessoa seleciona um ou mais assuntos técnicos em um TRT THEN the system SHALL procurar esses valores em `assuntos.nome`.
2. WHEN mais de um assunto é selecionado THEN matching any selected subject SHALL satisfy the subject filter; all other populated filters SHALL remain combined by AND.
3. WHEN the TRT search form opens THEN Insalubridade, Periculosidade and Acidente de trabalho SHALL be selected by default.
4. WHEN the selected tribunal is not a TRT THEN the technical-subject filter SHALL not be displayed or sent.
5. WHEN the person views the filter help THEN the system SHALL describe what each available filter searches.

---

### P1: Guardar e acompanhar processos encontrados

**User Story**: Como pessoa que prospecta nomeações, quero salvar processos encontrados e acompanhá-los na página de oportunidades antes de convertê-los em perícias.

**Why P1**: O resultado externo só vira dado de negócio quando selecionado, conforme AD-105.

**Acceptance Criteria**:

1. WHEN um resultado ainda não salvo é selecionado THEN the system SHALL persistir uma oportunidade e marcá-la como salva na busca.
2. WHEN a pessoa abre oportunidades THEN the system SHALL exibir as oportunidades salvas com paginação, status e ações atuais.

**Independent Test**: Salvar um resultado da busca e localizá-lo na página de oportunidades.

---

## Edge Cases

- Número CNJ inválido ou código não positivo SHALL ser rejeitado pela validação da entrada.
- Busca sem chave configurada SHALL manter a resposta `datajud_not_configured` documentada em AD-105.
- Falha ou indisponibilidade do Datajud SHALL manter a resposta `datajud_unavailable`.
- Busca paginada SHALL preservar o conjunto de filtros da busca inicial.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DAT-01 | P1: Encontrar processos com os filtros do Datajud | Design | Pending |
| DAT-02 | P1: Guardar e acompanhar processos encontrados | Design | Pending |

## Success Criteria

- [ ] Busca por número CNJ e por códigos de classe/órgão é suportada ponta a ponta.
- [ ] Resultados escolhidos continuam disponíveis em oportunidades para análise e conversão.
