# Montagem do laudo — Specification

**Origem**: pedido da perita em 2026-11-01 (itens 5 a 10 da lista de ajustes: escolher modelo e seções depois de iniciado, modelo trabalhista padrão o mais completo possível, pré-preencher pelo PDF do processo completo, visualizar o PDF antes de salvar e fotos em tabela 2x3 nos anexos da NR-15 e NR-16). Prefixo de requisito: `LMO`.

## Problem Statement

O "Iniciar laudo" já escolhe o modelo e marca as seções (`apps/web/src/routes/_private/expert-reports/add/`), mas, criado o rascunho, a perita não consegue mais trocar o modelo nem acrescentar uma seção que deixou de marcar: só remover. O modelo padrão trabalhista ainda é enxuto, os dados que estão no processo (quesitos, admissão, função, pedidos da inicial) são redigitados, o resultado só é visto baixando o arquivo, e as fotos de cada agente da NR-15/NR-16 entram uma a uma no texto.

## Goals

- [ ] No rascunho, a perita marca e desmarca seções do modelo (caixas de marcar) e pode trocar o modelo.
- [ ] O modelo padrão trabalhista cobre todos os anexos da NR-15 e da NR-16, com o texto "sim" e "não" de cada um.
- [ ] O PDF do processo completo pré-preenche quesitos, dados trabalhistas e pedidos da inicial.
- [ ] A perita vê o PDF na tela antes de concluir e baixa em PDF ou Word.
- [ ] Cada anexo da NR-15 e NR-16 tem um quadro de fotos 2x3 com título e legenda.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Enviar modelo próprio em Word | A perita pediu para não fazer por enquanto (2026-11-01). |
| Ler PDF escaneado (OCR) e IA de redação | AD-114 e AD-124. |
| Relatório fotográfico geral da vistoria | Já especificado em `laudo-vistoria` (LVI-01); aqui são as fotos **de cada anexo**. |

---

## Já existe (não refazer)

| Item | O que já há | Lacuna |
| --- | --- | --- |
| Escolher modelo e seções | Página `/expert-reports/add` com seletor de modelo e `SectionsPicker` (caixas e variante sim/não) | Só antes de criar o rascunho. |
| Remover seção | `details/` remove e renumera | Não há "acrescentar". |
| Exportar | PDF e Word (`report.templates.ts`, `report.docx.ts`) | Só por download; nada de pré-visualização. |
| Foto no laudo | "Inserir foto" (AD-129), fotos da vistoria do tenant | Sem quadro 2x3 com título e legenda. |
| PDF da ata | `extractMinutes` em `apps/api/src/modules/case/import.service.ts` (regras sobre o texto, AD-114), até 50 MB | Não lê quesitos, dados trabalhistas nem pedidos. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Modelo próprio em Word | Fora | Pedido da perita | Yes (2026-11-01) |
| Origem das fotos dos anexos | Fotos da vistoria **ou** enviadas no próprio anexo | Escolha da perita | Yes (2026-11-01) |
| O que o PDF pré-preenche | Dados do cadastro + quesitos + dados trabalhistas + pedidos da inicial | Escolha da perita | Yes (2026-11-01) |
| Leitura do processo | Por regras sobre o texto, como a ata (AD-114); o que não for achado fica em branco e é listado | Sem IA (AD-124); extração nunca é 100% (AD-115) | No |
| Trocar o modelo de um rascunho | Recria as seções a partir do novo modelo; o texto já editado das seções que somem se perde, com aviso na confirmação | Seções de modelos diferentes não se correspondem | No |
| Seção acrescentada depois | Entra na posição do modelo, com o texto do modelo e as variáveis resolvidas | Mesma regra do início do laudo | No |
| Quadro de fotos | 6 fotos por quadro (2 colunas × 3 linhas), título do quadro e legenda por foto; mais de 6 fotos abre outro quadro | Pedido da perita | No |
| Pré-visualização | Botão "Visualizar PDF" abre o PDF numa janela da tela, sem baixar; variável sem valor aparece destacada em vez de bloquear | Ver antes de concluir; o bloqueio continua em exportar e concluir (AD-126) | No |
| Texto-base dos anexos novos | Rascunho técnico, a revisar pela perita antes de ir ao ar | AD-127 | No |

---

## User Stories

### P1: Seções e modelo no rascunho ⭐ MVP — LMO-01

**User Story**: Como perita, quero marcar e desmarcar as seções do modelo no laudo já iniciado, e trocar o modelo, para montar o laudo conforme o caso.

**Acceptance Criteria**:

1. WHEN a perita abre "Seções do modelo" num rascunho THEN the system SHALL mostrar todas as seções do modelo com caixa de marcar e variante sim/não, marcadas as que estão no laudo.
2. WHEN ela marca uma seção ausente THEN the system SHALL acrescentá-la na posição do modelo, com variáveis resolvidas, e renumerar.
3. WHEN ela desmarca uma seção THEN the system SHALL pedir confirmação se o texto foi editado e removê-la.
4. WHEN ela troca o modelo THEN the system SHALL avisar que o texto editado será perdido e recriar as seções pelo novo modelo.
5. WHEN o laudo está concluído THEN the system SHALL bloquear essas ações (AD-126; reabrir é LVI-03).

### P1: Modelo trabalhista completo — LMO-02

**User Story**: Como perita, quero que o modelo padrão trabalhista traga tudo o que um laudo pode ter, para só desmarcar o que não se aplica.

**Acceptance Criteria**:

1. WHEN o modelo padrão de laudo trabalhista é aberto THEN the system SHALL listar os anexos 1 a 14 da NR-15 e 1 a 5 da NR-16 (mais radiações ionizantes), cada um com texto "sim" e "não", além de identificação, objetivo, metodologia, atividades, EPI, quesitos, conclusão e honorários.
2. WHEN um laudo é iniciado por esse modelo THEN the system SHALL vir com todas as seções marcadas, para a perita desmarcar.

### P1: Pré-preencher pelo processo completo — LMO-03

**User Story**: Como perita, quero enviar o PDF do processo completo e ter quesitos, dados trabalhistas e pedidos da inicial já no laudo.

**Acceptance Criteria**:

1. WHEN a perita envia o PDF no rascunho THEN the system SHALL achar os quesitos do juízo, do reclamante e da reclamada e colocá-los nas seções de quesitos, um por item.
2. WHEN acha admissão, demissão, função e local de trabalho THEN the system SHALL propor esses dados para a perícia (a perita confirma antes de gravar).
3. WHEN acha os pedidos da inicial THEN the system SHALL resumir os agentes e adicionais pedidos (insalubridade, periculosidade) na seção de objetivo.
4. WHEN algo não é achado THEN the system SHALL listar o que faltou, sem apagar o que já está escrito.
5. WHEN o PDF passa de 50 MB ou não tem texto THEN the system SHALL dizer o motivo e o limite.

### P2: Visualizar e baixar — LMO-04

**User Story**: Como perita, quero ver o PDF do laudo na tela antes de concluir e baixar em PDF ou Word.

**Acceptance Criteria**:

1. WHEN a perita clica em "Visualizar PDF" THEN the system SHALL mostrar o PDF na tela, sem baixar, com as pendências destacadas.
2. WHEN ela baixa THEN the system SHALL oferecer PDF e Word.

### P2: Fotos nos anexos da NR-15 e NR-16 — LMO-05

**User Story**: Como perita, quero pôr as fotos de cada agente no seu anexo, num quadro 2x3 com título e legenda.

**Acceptance Criteria**:

1. WHEN a perita adiciona fotos a uma seção de anexo THEN the system SHALL permitir escolher fotos da vistoria da perícia ou enviar novas.
2. WHEN as fotos são adicionadas THEN the system SHALL montá-las em quadro de 2 colunas por 3 linhas, com título do quadro e legenda editável por foto.
3. WHEN há mais de 6 fotos THEN the system SHALL abrir um novo quadro.
4. WHEN o laudo é exportado THEN the system SHALL desenhar o quadro igual no PDF e no Word.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LMO-01 | Seções e modelo no rascunho | Specify | Pending |
| LMO-02 | Modelo trabalhista completo | Specify | Pending |
| LMO-03 | Pré-preencher pelo processo completo | Specify | Pending |
| LMO-04 | Visualizar e baixar | Specify | Pending |
| LMO-05 | Fotos nos anexos | Specify | Pending |

## Pontos de atenção para o design

- Módulo dono: `documents`; a leitura do PDF reaproveita o `extractPdf` de `case` pelo service (AD-038).
- O quadro 2x3 precisa entrar na allowlist de HTML do laudo (`REPORT_HTML_TAGS`, AD-123) e ser desenhado pelo Word (`report.docx.ts`).
- Envio de foto no laudo usa o storage por perícia (AD-146) e a cota do tenant (AD-120).
- Coordenar com `laudo-vistoria` (LVI-01 a LVI-04) para não haver dois botões de foto diferentes.
