---
feature: Novo laudo
slug: novo-laudo
descricao: OS por serviço, responsável técnico do laudo, modelo trabalhista da perita, editor em rolagem com itens novos e layout do laudo
data: 2026-11-03
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-161, AD-162, AD-163, AD-170, AD-171, AD-172]
spec: [.specs/features/novo-laudo]
branches: [main]
---

# Novo laudo

**Status**: concluido · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='novo-laudo'`.

## O que foi feito

- **Controle de OS** no Escritório, depois de logo, cabeçalho e rodapé: "O escritório já tem número de controle de OS?" (sigla, ano e último número) ou "Criar sequência de OS". "Personalizar padrão da OS" troca o formato (marcadores `[SIGLA]`, `[ANO]`, `[NUMERO]` e dígitos do número; "Usar o padrão sugerido" volta ao ETH-2026-001). Cada serviço novo recebe o próximo número (ETH-2026-009), que volta a 001 em janeiro quando o padrão tem o ano; a OS aparece e se edita no serviço e sai na capa do laudo (`[NUMERO_OS]`).
- **Responsável técnico**: cadastro de quem assina laudos além da dona da conta (nome, CPF, registro, formação, telefone, logo, cabeçalho e rodapé), sem acesso ao Ethica, no Escritório e no "Novo laudo". O laudo dele sai com os dados e a identidade dele (vazio cai no do escritório).
- **Novo laudo** (botão no hub e na lista de Laudos): serviço (por número ou nome), OS vinculada (digitável se o serviço não tiver), responsável técnico com os dados pessoais e modelo com os itens. Sair para outra tela com o serviço escolhido pergunta "Salvar como rascunho?" (salvar e seguir, descartar e sair ou ficar).
- **Modelo "Laudo pericial trabalhista"** com os 21 itens e subitens do laudo da perita (objeto e considerações preliminares sem número, abertura ao juiz e "É o laudo." com assinatura); o modelo anterior segue como "Laudo pericial (NR-15 e NR-16)".
- **Editor em rolagem**: todos os itens numa lista numerada e compacta, tudo recolhido ao abrir, clique em qualquer ponto da linha abre o item, expandir/recolher tudo e um a um, "Faz parte do laudo" escrito uma vez acima da lista, "Faz parte do laudo" (fora do laudo não sai no PDF/Word nem bloqueia), selo "pendente" (e "pendente · vistoria" quando falta dado da vistoria), "Adicionar item abaixo" (item ou subitem) e remover item.
- **Layout** no laudo e no modelo do escritório: fonte (Times New Roman, Arial), tamanho, entrelinha, espaço entre parágrafos, margens, cor dos títulos, capa, sumário e abertura/assinatura final, no PDF e no Word.
- **Salvar como modelo** no "…" do laudo: os itens que fazem parte do laudo, com o texto escrito, viram um modelo do escritório; os dados do serviço voltam a ser marcadores (AD-170). Desmarcar um tópico desmarca os subitens (no laudo e na escolha de itens do modelo).
- **Linha de cada item**: setas para subir/descer (o item vai com os subitens, dentro do tópico), "Faz parte do laudo" e "…" com Editar título, Adicionar item abaixo, Adicionar subitem e Remover; o item aberto só edita o texto (AD-171).
- **Cabeçalho do laudo** só com Visualizar PDF e Concluir; Preencher pelo processo, Seções do modelo, Layout, Salvar como modelo e Exportar PDF/Word ficam no "…".
- **Componente padrão** `NumberedList` (lista numerada expansível, visual do bloco `feature207`).

## Por que

Pedido da perita (2026-11-03), com o laudo `ETH-2026-008` dela como modelo e o protótipo `index_tabela.html`. As escolhas foram dela: OS sigla + ano + sequência só para serviços novos; responsável técnico só como cadastro, sem acesso; layout com fonte, margens/espaçamento, páginas e cor.

Não desfazer sem ler: a sequência de OS é do módulo `case` (`ServiceOrderSequence`), porque `case` não depende de ninguém e é ele quem numera no cadastro (AD-161); o responsável técnico é `Signatory`, coleção do `documents`, com logo pela cota do escritório (AD-162); o item "fora do laudo" fica no rascunho com o texto (`included`), e o layout é copiado do modelo para o laudo (AD-163).

## Como

### `apps/api`

- `apps/api/src/modules/case/service-order.repository.ts` — sequência (`take` num único update com pipeline); `case.service.ts` dá a OS no cadastro e traduz OS repetida em `service_order_taken`; `GET|PUT /expert-cases/service-order` (`PUT` só admin).
- `apps/api/src/modules/documents/signatory.*` — `/expert-reports/signatories` (CRUD e logo, permissão `expert_reports`); `documentSigner` monta quem assina e a identidade.
- `apps/api/src/modules/documents/report.service.ts` — `currentData` usa o responsável do laudo; `addSection`; `setLayout`; `chooseSections` mantém os itens adicionados; exportação só com os itens que fazem parte do laudo.
- `apps/api/src/modules/documents/report.library.ts` — `DEFAULT_TEMPLATES` em lista, com o modelo trabalhista (`standard-labor-report`).
- `apps/api/src/modules/documents/report.templates.ts` e `report.docx.ts` — layout, abertura e "É o laudo."; `apps/api/src/providers/pdfRenderer.ts` aceita margens.
- `report.service.ts` — `saveAsTemplate` (`POST /expert-reports/:id/template`, permissão `report_templates.create`) e `updateSection` com `included` levando os subitens (`sectionFamily` em `packages/contracts/src/schemas/report.schema.ts`); `template.service.ts` — `createFromReport`.
- Rotas novas: `POST /expert-reports/:id/sections`, `PUT /expert-reports/:id/layout`, `PUT /expert-reports/templates/:id/layout`.

### `apps/web`

- `apps/web/src/components/numbered-list.tsx` (NLA-07) e `signatory-dialog.tsx`.
- `apps/web/src/routes/_private/expert-reports/details/@components/report-sections-list.tsx`, `report-section-editor.tsx`, `add-section-dialog.tsx`; `expert-reports/@components/layout-dialog.tsx`.
- `apps/web/src/routes/_private/expert-reports/add/@components/service-order-field.tsx` e `signatory-picker.tsx`.
- `apps/web/src/routes/_private/_admin/office/@components/office-service-order.tsx` e `office-signatories.tsx`.
- `apps/web/src/query/signatory.ts`; `query/account.ts` e `lib/helpers/resizeLogo.helper.ts` saíram das rotas para serem compartilhados.

### `packages`

- `packages/contracts/src/schemas/report.schema.ts` — `REPORT_DEFAULT_TEMPLATES` (id → tipo), `defaultTemplateOf`, `reportLayoutSchema`, `addReportSectionSchema`, `signatorySchema`, `numberSections` com itens sem número e fora do laudo; `document.schema.ts` — `serviceOrderSettingsSchema`, `formatServiceOrder`; `case.schema.ts` — `serviceOrder`.
- `packages/db/src/models/` — `service-order.model.ts`, `signatory.model.ts`; `Case.serviceOrder` (índice único parcial), `Report.Signatory`/`layout`, `sections[].unnumbered`/`included`, `Template.layout`. Sem migração: o que falta vale o padrão.

## Como testar

```
pnpm vitest run apps/api/src/modules/documents apps/api/src/modules/case packages/contracts
pnpm run check && (cd apps/web && pnpm run build)
```

- Escritório → Controle de OS → criar a sequência; cadastrar um serviço e ver a OS; Escritório → Responsáveis técnicos; Laudos → Novo laudo → escolher serviço, responsável e o modelo "Laudo pericial trabalhista"; no laudo, Expandir tudo, desmarcar "Faz parte do laudo", "Adicionar item abaixo", Layout e Visualizar PDF.

## Pendências

- [ ] Conferência visual das telas novas no navegador (não feita nesta entrega).
- [ ] Textos-base dos itens novos do modelo trabalhista ficam vazios para a perita escrever (só os que o processo/vistoria preenchem vêm com texto).
- [ ] A cidade antes da data ("Itajaí/SC, …") não sai: o Ethica não guarda a cidade do escritório.
- [ ] Responsável técnico excluído: o laudo dele volta a sair com quem gera o arquivo.

## Histórico

- 2026-11-03 — Lista de laudos: a lixeira do rascunho passa para o início da linha (à esquerda do ícone do laudo, acinzentada e vermelha ao passar o mouse) e entra a coluna Partes, igual à da lista de serviços (autor em cima, réu embaixo). A API devolve `plaintiff`/`defendant` do resumo da perícia junto com o número (`apps/api/src/modules/documents/report.service.ts`).

- 2026-11-03 — Título do item em maiúsculas e do subitem com a primeira letra maiúscula, na tela, no PDF e no Word (AD-174). "Excluir rascunho" no "…" do laudo (sai o botão Remover do rodapé, e só aparece para quem pode excluir) e lixeira na linha do rascunho na lista de laudos. Calibri, Cambria e Source Sans Pro entram nas fontes do laudo e do cabeçalho/rodapé do escritório; o servidor do PDF instala Carlito e Caladea (mesmas medidas de Calibri e Cambria) e Source Sans 3 (`Dockerfile`).

- 2026-11-03 — Lista do laudo como sumário: subitens só aparecem com o item de cima aberto (`NumberedList`); no Escritório, fonte, tamanho e alinhamento do cabeçalho e do rodapé viram três ícones ao lado do nome (AD-172).

- 2026-11-03 — "Faz parte do laudo" passa para o começo da linha de cada item e subitem, antes do número (pedido da perita com foto do protótipo); setas e "…" seguem no fim da linha.

- 2026-11-03 — Padrão de OS personalizável, saída do "Novo laudo" pergunta pelo rascunho, lista do laudo compacta com a linha inteira clicável e tudo recolhido (`ProductSpecs` também), formatação do cabeçalho/rodapé do escritório (AD-172). Plano: `.specs/features/novo-laudo/plans/2026-11-03-ajustes-escritorio-e-laudo.md`.

- 2026-11-03 — Título, item novo, subitem e setas na linha de cada item (AD-171): `section-title-dialog.tsx` substitui `add-section-dialog.tsx`; `POST /expert-reports/:id/sections/:sectionId/move`. Item novo passa a entrar depois dos subitens; item criado no laudo não some mais ao refazer a escolha de itens do modelo.
- 2026-11-03 — Salvar como modelo pelo "…", tópico desmarcado leva os subitens e ações do laudo agrupadas no "…" (AD-170). Componente novo: `apps/web/src/routes/_private/expert-reports/details/@components/save-template-dialog.tsx`.
- 2026-11-03 — Implementado NLA-01 a NLA-07 (AD-161 a AD-163). Divergências da spec: a sequência de OS mora no módulo `case` (coleção própria) e não no escritório, para o `case` seguir sem depender de `identity`; sem responsável cadastrado o laudo sai com quem gera o arquivo (como já era), não com quem o criou; o operador também cadastra responsável técnico (mesma permissão de criar laudo).
- 2026-11-03 — Spec criada (`.specs/features/novo-laudo/spec.md`).
