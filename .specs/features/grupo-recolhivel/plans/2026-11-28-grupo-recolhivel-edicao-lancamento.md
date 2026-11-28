# Grupo recolhível único e edição do lançamento na página

Pedido do usuário (2026-11-28), trazendo dois padrões do DentalEase (`src/routes/_private/financial/details/`):

1. **Edição do lançamento na própria página.** O detalhe do lançamento (`apps/web/src/routes/_private/finance/details/index.tsx`) mostra o formulário de edição abaixo da leitura, com Salvar no cabeçalho e no rodapé. Sai o diálogo de edição (botão Editar, `panel === 'edit'`, o ramo de edição do `TransactionForm` com a lista de recebimentos dentro). O "Novo lançamento" da listagem continua em diálogo; o diálogo de recebimento continua.
2. **Grupo recolhível com cabeçalho fino e acinzentado como padrão.** Os blocos recolhíveis de uma página ficam empilhados numa moldura só, cada um com cabeçalho fino em `bg-muted`, em vez de um cartão com borda por bloco.

## Passos

1. `apps/web/src/components/panel.tsx`
   - `Panel`: cabeçalho fino (`px-4 py-2.5`, `bg-muted`, ícone sem ladrilho), sem borda própria; `border-t` com `-mt-px` para o divisor sobreviver ao `order-last` do bloco vazio (AD-238), que muda a ordem visual e não a do DOM.
   - `PanelGroup` novo: a moldura (`rounded-lg border overflow-hidden`, coluna flex) e o "Expandir tudo · Recolher tudo" acima dela quando há mais de um bloco; abre/fecha todos os `Panel` de dentro por contexto.
   - Começa tudo recolhido (AD-172), conteúdo montado enquanto fechado (diálogos dos botões do cabeçalho continuam abrindo).
2. `apps/web/src/components/product-specs.tsx` vira só a tabela rótulo/valor (`ProductSpecs specs`), sem o recolhível próprio nem o expandir/recolher (passam para `Panel`/`PanelGroup`). Saem `ProductSpecGroup`, `children`, `footer` e `actions` do grupo (sem uso).
3. Usos:
   - `expert-cases/details`: `CaseDetailsView` põe os grupos (Juízo, Partes, Observações…) e os blocos da página (Prazos, Vistorias, Laudos, Movimentações, Financeiro, Compromissos…) num `PanelGroup` só; a página passa os blocos como `children`.
   - `parties/details`, `agenda/@components/appointment-detail.tsx`, `components/notification-dialog.tsx`: `PanelGroup` + `Panel` + `ProductSpecs`.
4. Financeiro:
   - `finance/@components/transaction-fields.tsx` novo com os campos (como o `CaseFormFields`), usado pelo diálogo de criação e pela edição.
   - `finance/@components/transaction-form.tsx` fica só o diálogo de criação.
   - `finance/details/@components/transaction-edit-form.tsx` novo: formulário na página, `DefaultFormLayout` horizontal com o título "Editar lançamento", `toast` "Salvo." ao salvar; só para quem tem `finance.update`.
   - `useTransactionForm`: na edição usa `values` (com `keepDirtyValues`) para acompanhar o lançamento depois de um recebimento ou estorno feito na mesma página.
5. Testes: `product-specs`, `panel` (grupo), `case-details-view`, e os que dependem do texto do bloco.
6. Registro: AD-312, skill `ethica-web-standards` (SKILL.md, `page-patterns.md`, `visual.md`), `feature.md` novo `grupo-recolhivel`, roadmap, `pnpm docs:sync`.
