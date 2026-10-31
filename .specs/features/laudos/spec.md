# Laudo automatizado — Specification

**Origem**: onda 4 da gap analysis `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (inventário §7). Depende de `.specs/features/documentos-pdf/spec.md` (identidade e geração de PDF). Roadmap #7.

## Problem Statement

O laudo é o produto final do perito e hoje é escrito fora do Ethica, copiando à mão número do processo, partes, datas e o resultado da vistoria, e repetindo a mesma fundamentação legal (NR-15, NR-16) em todo laudo. O concorrente resolve isso com modelos por seções, texto positivo/negativo por seção, variáveis e IA de redação, mas com defeitos observados: variáveis concatenadas a texto fixo na capa, chaves da vistoria que não chegam ao laudo e geração de modelo por IA quebrada.

## Goals

- [ ] Modelos de laudo do escritório, organizados em seções numeradas, com texto base para "sim" (presente/positivo) e "não" (ausente/negativo).
- [ ] Iniciar um laudo escolhendo as seções e a variante de cada uma, com as variáveis da perícia já preenchidas.
- [ ] Editar seção a seção, com apoio de IA para redação técnica, e exportar em PDF e Word com a identidade do escritório.
- [ ] Biblioteca padrão para perícia trabalhista (insalubridade NR-15 anexos 1–14, periculosidade NR-16, quesitos, conclusão, honorários).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Dados de vistoria do app de campo como variáveis | Onda 5 (campo); o motor de variáveis já deve aceitá-los depois. |
| Gerar o modelo inteiro por IA | Baixo valor e alto risco (falhou no concorrente). |
| Protocolo no PJe | Feito pelo perito. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Editor de texto rico | **Pendente de decisão**: editor no `apps/web` compatível com o design system (Base UI/Tailwind) e que gere HTML limpo para o PDF | O PDF da onda 3 é HTML→PDF (se essa for a decisão) | No |
| IA de redação | **Pendente de decisão (vira AD)**: provedor, custo por tenant e tratamento LGPD do texto do laudo | Texto do laudo tem dados pessoais e de saúde | No |
| Variáveis | Marcadores `[NOME_AUTOR]`, `[NUMERO_PROCESSO]`, `[VARA]`, `[DATA_EXTENSO]`, `[PERITO_NOME]`, `[PERITO_REGISTRO]` etc., resolvidos na abertura e de novo na exportação | Dado do processo é fonte única (`PRODUCT.md`) | No |
| Variável sem valor | Fica destacada no editor e bloqueia a conclusão até ser preenchida ou removida | Evita "XXXXXXXX" e capa quebrada no documento final | No |
| Status do laudo | `rascunho` → `concluido` (só leitura); concluir oferece avançar a etapa da perícia para `laudo_entregue` e dar baixa no prazo "Entrega do laudo" | O concorrente não liga laudo ao prazo; aqui liga | No |
| Quem pode editar modelos | `admin` e `manager`; qualquer papel redige laudo | Modelo é padrão do escritório | No |

---

## User Stories

### P1: Modelos de laudo do escritório ⭐ MVP

**Acceptance Criteria**:

1. WHEN o usuário cria um modelo THEN the system SHALL permitir começar em branco ou clonando o modelo padrão.
2. WHEN o usuário edita uma seção THEN the system SHALL guardar código, título, ordem, "apenas título", quebra de página, texto "sim" e texto "não".
3. WHEN o usuário insere uma variável THEN the system SHALL listar as variáveis disponíveis com exemplo de valor.

### P1: Iniciar o laudo de uma perícia ⭐ MVP

**Acceptance Criteria**:

1. WHEN o perito escolhe a perícia e o modelo THEN the system SHALL mostrar o resumo do processo e a árvore de seções para marcar/desmarcar e escolher "sim" ou "não" em cada uma.
2. WHEN o perito confirma THEN the system SHALL criar o laudo em `rascunho` com as seções escolhidas, o texto da variante e as variáveis resolvidas.

### P1: Redigir e exportar ⭐ MVP

**Acceptance Criteria**:

1. WHEN o perito edita uma seção THEN the system SHALL salvar sem perder as outras seções e renumerar ao remover uma seção.
2. WHEN o perito exporta THEN the system SHALL gerar PDF e Word com capa, sumário, seções, cabeçalho/rodapé e numeração de página do escritório.
3. WHEN há variável sem valor THEN the system SHALL impedir a conclusão e apontar a seção.
4. WHEN o perito conclui THEN the system SHALL bloquear a edição, oferecer avançar a etapa da perícia e dar baixa no prazo "Entrega do laudo".

### P2: Redação com IA

**Acceptance Criteria**:

1. WHEN o perito pede melhoria de uma seção THEN the system SHALL devolver uma sugestão em linguagem técnico-pericial, mostrada ao lado do original para aceitar ou descartar.
2. WHEN a IA falha ou demora além do limite THEN the system SHALL manter o texto original e avisar.

### P2: Parecer técnico do assistente técnico

**User Story**: Como assistente técnico de uma das partes, quero emitir parecer técnico com o mesmo motor do laudo, para contestar ou complementar o laudo pericial.

**Acceptance Criteria** (definido pelo usuário em 2026-10-31):

1. WHEN a perícia tem `papel = assistente_tecnico` THEN the system SHALL oferecer o tipo de documento **parecer técnico** no lugar de laudo pericial, com modelos próprios.
2. WHEN o assistente redige o parecer THEN the system SHALL permitir seções de medições de agentes quantitativos feitas junto com as do perito, quesitos complementares e suplementares e impugnação do laudo pericial.
3. WHEN a justiça é trabalhista THEN the system SHALL nomear as partes reclamante/reclamada; WHEN cível THEN autor/réu — a lógica e os entregáveis são os mesmos.

### P2: Biblioteca padrão trabalhista

**Acceptance Criteria**:

1. WHEN um tenant é criado THEN the system SHALL disponibilizar o modelo padrão com as seções de insalubridade (NR-15 anexos 1–14), periculosidade (NR-16), quesitos (reclamante, reclamada, juízo), conclusão, honorários e encerramento.

---

## Edge Cases

- Perícia excluída SHALL excluir seus laudos (ou impedir a exclusão com laudo concluído — decidir no design).
- Modelo alterado depois de iniciado o laudo SHALL não alterar o laudo já criado.
- Laudo concluído SHALL não ser editável nem por URL direta (o bloqueio é no servidor; no concorrente era só no cliente).

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LAU-01 | P1: Modelos de laudo | Specify | Pending |
| LAU-02 | P1: Iniciar o laudo | Specify | Pending |
| LAU-03 | P1: Redigir e exportar | Specify | Pending |
| LAU-04 | P2: Redação com IA | Specify | Pending |
| LAU-05 | P2: Biblioteca padrão trabalhista | Specify | Pending |
| LAU-06 | P2: Parecer técnico do assistente técnico | Specify | Pending |

## Success Criteria

- [ ] Um laudo de insalubridade sai do Ethica em PDF e Word sem redigitar dados do processo.
- [ ] Nenhum documento exportado contém marcador de variável não resolvido.
