# Vistoria no laudo e revisão do laudo — Specification

**Origem**: roadmap item 7 (`docs/roadmap.md`: "faltam fotos e anotações da vistoria"), pendências de `docs/features/laudos/feature.md` e `docs/features/campo-vistorias/feature.md`, pedido do usuário em 2026-11-01 ("o laudo precisa do botão editar, pois pode ser concluído sem querer; excluir pode existir, mas depende de confirmação explícita"). Prefixo de requisito: `LVI`.

## Problem Statement

O que a perita colhe na vistoria (fotos, observações, notas de cada agente e de cada documento) já fica no Ethica (`campo-vistorias`), mas só uma parte chega ao laudo: as variáveis de campo cobrem presentes, paradigmas, funções, agentes e documentos, e as fotos entram **uma por uma** pelo "Inserir foto" do editor. O relatório fotográfico, que todo laudo pericial tem, ainda é montado à mão, e as anotações feitas em campo (observações gerais e notas por agente e documento) são redigitadas.

Além disso, o laudo concluído fica só para leitura para sempre (AD-126): um clique errado em "Concluir" obriga a excluir a perícia inteira. Excluir um laudo hoje é um diálogo de confirmação simples, fácil de aceitar por engano.

## Goals

- [ ] Fotos da vistoria entram no laudo em bloco (relatório fotográfico com legenda e numeração), sem inserir uma a uma.
- [ ] As anotações da vistoria chegam ao laudo como variáveis, sem redigitar.
- [ ] Laudo concluído pode voltar a ser editado.
- [ ] Excluir laudo exige confirmação explícita, que não se aceita por reflexo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Desenhar sobre a foto (setas, círculos, medidas) | Ver pergunta em aberto; se a perita confirmar que é necessário, vira story própria. |
| Transcrição do áudio da vistoria | IA adiada (AD-124). |
| Redação do laudo por IA | IA adiada (AD-124). |
| Mudar o layout de capa, sumário ou cabeçalho do PDF/Word | Já definido em `laudos` (AD-125). |

---

## Já existe (não refazer)

| Item | O que já há | Lacuna |
| --- | --- | --- |
| Foto no laudo | "Inserir foto" no editor (`apps/web/src/components/rich-text-editor.tsx`), `img` restrito às mídias do tenant no PDF e no Word (AD-129) | Inserir todas de uma vez, com numeração "Foto 1, Foto 2…" e legenda. |
| Variáveis de campo | `[PRESENTES_VISTORIA]`, `[PARADIGMAS_*]`, `[FUNCOES_*]`, `[AGENTES_*]`, `[DOCUMENTOS_SOLICITADOS]`, `[HORA_VISTORIA]` (`packages/contracts/src/schemas/report.schema.ts`, AD-130) | Observações gerais e notas por agente/documento não viram variável. |
| Registro da vistoria | `notes` gerais e `notes` por agente e por documento (`packages/contracts/src/schemas/inspection.schema.ts`) | — |
| Excluir laudo | `DELETE /expert-reports/:id` e `ConfirmDialog` em `apps/web/src/routes/_private/expert-reports/details/index.tsx` | Confirmação explícita; hoje só rascunho é excluível (AD-126). |
| Concluir laudo | `draft` → `completed` com "Registrar a entrega" (protocola o prazo, lança movimentação, avança a etapa) | Volta de `completed` para `draft`. |

---

## Assumptions & Open Questions

Decisões a confirmar com a perita (usuária final) antes do design. A coluna "Confirmed?" é atualizada por quem confirmar.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Relatório fotográfico | Variável `[RELATORIO_FOTOGRAFICO]` que vira todas as fotos da última vistoria feita, na ordem do registro, com "Foto N — legenda", e um botão "Inserir todas as fotos" no editor que faz o mesmo no ponto do cursor | A variável serve ao modelo padrão; o botão serve a quem quer escolher onde | No |
| Qual vistoria | A última vistoria feita da perícia, como as outras variáveis de campo (AD-130) | Mesma regra das variáveis existentes; perícia com duas vistorias usa "Inserir foto" para as da outra | No |
| Observações gerais | Variável `[OBSERVACOES_VISTORIA]` com o campo `notes` do registro | Hoje o campo se chama "observações internas" na tela: confirmar se pode ir ao laudo ou se é preciso um campo novo "anotações para o laudo" | No |
| Notas por agente e documento | Entram como complemento em `[AGENTES_PRESENTES]` e `[DOCUMENTOS_SOLICITADOS]` ("Ruído — Sim, EPI: protetor auricular. Nota: …") | Evita variáveis novas para o mesmo bloco | No |
| Desenho sobre a foto | Fora desta rodada | Exige editor de imagem no celular; confirmar com a perita se as fotos precisam de marcação | No |
| Reabrir ("Editar") laudo concluído | Botão "Editar laudo" no laudo concluído volta o status para rascunho, com confirmação; **não desfaz** o prazo protocolado, a movimentação de entrega nem a etapa da perícia | Desfazer automaticamente apagaria fatos do processo que podem ser verdadeiros; a perita ajusta prazo e etapa nas telas deles se a entrega não aconteceu | No |
| Quem reabre e exclui | Quem tem `expert_reports` `update` (reabrir) e `delete` (excluir) na matriz (AD-137) | Mesma permissão das ações irmãs | No |
| Confirmação explícita de exclusão | Diálogo que só habilita "Excluir" depois de digitar o número do processo do laudo; vale para rascunho e concluído | Padrão de "digitar para confirmar" não se aceita por reflexo | No |
| Registro | Reabrir e excluir entram no diário de bordo (AD-134) | Toda escrita já entra | No |

---

## User Stories

### P1: Relatório fotográfico ⭐ MVP — LVI-01

**User Story**: Como perita, quero colocar todas as fotos da vistoria no laudo de uma vez, numeradas e com legenda, para não montar o relatório fotográfico à mão.

**Acceptance Criteria**:

1. WHEN o modelo tem `[RELATORIO_FOTOGRAFICO]` e a perícia tem vistoria feita com fotos THEN the system SHALL resolver a variável em todas as fotos da última vistoria feita, na ordem do registro, cada uma com "Foto N" e a legenda.
2. WHEN a perita usa "Inserir todas as fotos" no editor THEN the system SHALL inserir o mesmo bloco no ponto do cursor.
3. WHEN a perícia não tem vistoria feita com fotos THEN the system SHALL tratar a variável como sem valor (pendência que bloqueia exportar e concluir, como as outras, AD-126).
4. WHEN o laudo é exportado THEN the system SHALL desenhar as fotos no PDF e no Word como já desenha a foto avulsa (AD-129).

**Independent Test**: perícia do seed com vistoria feita e fotos; iniciar laudo pelo modelo padrão com a variável; exportar PDF e ver as fotos numeradas.

### P1: Anotações da vistoria no laudo — LVI-02

**User Story**: Como perita, quero que o que anotei em campo apareça no laudo, para não redigitar.

**Acceptance Criteria**:

1. WHEN o modelo tem `[OBSERVACOES_VISTORIA]` THEN the system SHALL resolver com as observações do registro da última vistoria feita.
2. WHEN um agente ou documento do registro tem nota THEN the system SHALL incluí-la junto do item em `[AGENTES_PRESENTES]`, `[AGENTES_AUSENTES]` e `[DOCUMENTOS_SOLICITADOS]`.
3. WHEN a variável nova é criada THEN the system SHALL listá-la em "Inserir variável" com rótulo em pt-BR (`apps/web/src/components/report-labels.ts`).

**Independent Test**: registrar observação e nota de agente numa vistoria; abrir o laudo e ver os textos resolvidos.

### P1: Editar laudo concluído — LVI-03

**User Story**: Como perita, quero reabrir um laudo concluído sem querer, para corrigir sem excluir a perícia.

**Acceptance Criteria**:

1. WHEN o laudo está concluído THEN the system SHALL mostrar "Editar laudo" para quem tem permissão de editar laudos.
2. WHEN a perita confirma THEN the system SHALL voltar o laudo para rascunho, liberando editar, exportar e concluir de novo.
3. WHEN o laudo é reaberto THEN the system SHALL manter prazo, movimentação e etapa da perícia como estão e avisar isso na confirmação.
4. WHEN quem não tem permissão chama a rota THEN the system SHALL responder 403.

**Independent Test**: concluir um laudo, reabrir, editar uma seção e concluir de novo.

### P2: Excluir laudo com confirmação explícita — LVI-04

**User Story**: Como perita, quero que excluir um laudo peça uma confirmação que eu não aceite por engano.

**Acceptance Criteria**:

1. WHEN a perita pede para excluir THEN the system SHALL abrir um diálogo que explica que a exclusão não se desfaz e só habilita "Excluir" depois de digitar o número do processo.
2. WHEN o laudo está concluído THEN the system SHALL permitir excluir com a mesma confirmação (supera o "concluído não é excluído" da AD-126).
3. WHEN a exclusão acontece THEN the system SHALL registrá-la no diário de bordo.

**Independent Test**: tentar excluir sem digitar (botão desabilitado); digitar o número errado (desabilitado); digitar o certo e excluir.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LVI-01 | P1: Relatório fotográfico | Specify | Pending |
| LVI-02 | P1: Anotações da vistoria no laudo | Specify | Pending |
| LVI-03 | P1: Editar laudo concluído | Specify | Pending |
| LVI-04 | P2: Excluir laudo com confirmação explícita | Specify | Pending |

## Success Criteria

- [ ] Um laudo trabalhista do modelo padrão sai com relatório fotográfico e observações de campo sem nenhuma foto inserida à mão.
- [ ] Um laudo concluído por engano volta a ser editável em dois cliques.
- [ ] Nenhum laudo é excluído sem digitar o número do processo.

## Pontos de atenção para o design

- Módulo dono: `documents` (`apps/api/src/modules/documents/report.*`); dados da vistoria vêm de `agenda` por chamada de service, como as variáveis atuais (AD-038).
- A rota de reabrir é uma transição de status no repository (hoje o bloqueio é o filtro `status: 'draft'`, AD-126).
- As chaves das fotos mudam de lugar com a `producao-api` (AD-146): o `src` da foto no laudo é pela rota da API, não pela chave do storage, então o laudo não depende da organização das pastas.
- Chaves de tradução: consultar o dicionário antes de criar (AGENTS.md, "Idioma do código e tradução").
