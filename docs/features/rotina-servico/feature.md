---
feature: Rotina do serviço
slug: rotina-servico
descricao: Status único do serviço, partes do último despacho no PDF, planilha de qualquer modelo e nomes das seções; falta a base de varas dos TRTs
data: 2026-11-03
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-166, AD-167, AD-168]
spec: [.specs/features/rotina-servico]
branches: [main]
---

# Rotina do serviço

**Status**: parcial · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='rotina-servico'`.

## O que foi feito

- **Status único do serviço**, na ordem da rotina (nomeado – aguardando aceite até concluído, mais suspenso e recusado/cancelado), no cadastro, na edição, no detalhe, na listagem, no filtro, no gráfico do início e nos PDFs. Saem a etapa, a fase detalhada e o status antigo; os serviços existentes são convertidos ao status equivalente.
- **PDF do processo**: partes do último despacho (ou da petição inicial), data da última nomeação de perito e prazo do laudo em branco para a perita digitar.
- **Detalhe do serviço** sem o bloco "Dados do laudo trabalhista" e sem partes repetidas.
- **Importar planilha de qualquer modelo**: o Ethica mostra cada coluna com o campo sugerido (com ! no que não reconheceu), a perita confere e importa; o que não tem campo ou não dá para ler vai para Observações.
- Nomes: "Histórico de auditoria" (antes "Diário de bordo") e "Varas e comarcas" (antes "Varas").

## Por que

Pedido da perita (2026-11-03) olhando um serviço cadastrado pelo PDF do processo inteiro. Ela aprovou a lista de status sugerida, escolheu conferir só as colunas da planilha e pediu a base de varas dos TRTs pronta para todo escritório.

Não desfazer sem ler: o status único substitui três classificações (AD-166) e a conversão roda em toda subida da API, sem efeito depois da primeira; o rótulo do status na tela não é o valor (`CASE_STATUS_KEY`). A planilha não tem modelo fixo: o nome da coluna decide o campo (AD-167). O PDF ignora partes que só aparecem em cabeçalhos antigos (AD-168).

## Como

### `packages`

- `packages/contracts/src/schemas/case.schema.ts` — `CASE_STATUS`, `CASE_CLOSED_STATUSES`, `CASE_IDLE_STATUSES`; `status` aceito no cadastro.
- `packages/db/src/models/case.model.ts` — sem `phase`/`serviceStatus`; `migrateCases` (chamada em `apps/api/src/server.ts`).
- `packages/contracts/src/schemas/import.schema.ts` — `CSV_IMPORT_FIELDS`, sinônimos, `csvHeaderKey`, `suggestCsvField`, planilha de exemplo.

### `apps/api`

- `apps/api/src/modules/case/import.service.ts` — `extractParties` por blocos de cabeçalho, `extractNomination` (última); `parseCsv` com separador detectado, `rowToCase` por célula, `csvColumns`, `importCsv(tenant, text, fields)`.
- `POST /expert-cases/import/csv/columns` e `POST /expert-cases/import/csv?fields=` (`case.router.ts`, `csvImportQuerySchema` em `import.schema.ts`).
- `apps/api/src/modules/case/case.repository.ts` — partes sem repetição na leitura; parados e contagens pelo status único.
- `apps/api/src/modules/documents/` — rótulos dos status nos PDFs; concluir o laudo com a entrega passa a "laudo entregue".

### `apps/web`

- `apps/web/src/components/case-labels.ts` — `caseStatusLabel`, `CASE_STATUS_VARIANT`, `CASE_STATUS_ITEMS`.
- `apps/web/src/routes/_private/expert-cases/` — status no formulário, coluna, filtro e detalhe; `import/` com `@components/csv-columns-review.tsx` e `@hooks/use-csv-import.ts` (lê o CSV do Excel em Windows-1252).

## Como testar

```
pnpm vitest run apps/api/src/modules/case packages/db/src/models/case.model.int.test.ts packages/contracts
pnpm run check && (cd apps/web && pnpm run build)
```

- Serviços → Importar planilha → escolher um CSV qualquer → conferir as colunas → Importar. Serviços → Novo → Preencher com PDF do processo completo: partes do último despacho, prazo em branco.

## Pendências

- [ ] **Base de varas e comarcas dos 24 TRTs** (RSV-05), pronta para todo escritório: os sites dos tribunais montam a lista por programa na página e 6 deles (TRT1, 5, 13, 17, 21, 22) recusaram acesso automático; a coleta fica para uma próxima rodada.
- [ ] Conferência visual das telas no navegador.
- [ ] A planilha aceita uma parte e um advogado por polo; o resto se ajusta na tela.

## Histórico

- 2026-11-03 — Revisto pela `fase-servico` (AD-178): o status único foi dividido em fase (lista da perita) e status (Ativo, Suspenso, Cancelado).
- 2026-11-03 — Implementado RSV-01 a RSV-04 e RSV-06 (AD-166 a AD-168). RSV-05 pendente. Divergência da spec: a importação recebe os campos por `?fields=` com o próprio arquivo no corpo, sem JSON; sem objeto, o tipo de serviço vira o objeto.
- 2026-11-03 — Spec criada (`.specs/features/rotina-servico/spec.md`).
