# Importação de processos — Tasks

**Spec**: `.specs/features/importacao-processos/spec.md` · **Design**: `.specs/features/importacao-processos/design.md`

Gate de API: `pnpm -r exec tsc --noEmit && pnpm vitest run --project unit --project structural` + `--project integration --project e2e` dos arquivos tocados (Mongo local). Gate de web: `pnpm run check` + `(cd apps/web && pnpm run build)`. Commit único da feature no gate do passo 3 do `AGENTS.md`.

## Test Coverage Matrix

| AC | Camada | Teste |
| --- | --- | --- |
| IMP-01.1–2 (extração, faltantes) | unit | `apps/api/src/modules/pericia/importacao.service.unit.test.ts` (`extrairAta`) |
| IMP-01.3–5 (número inválido/duplicado, tipo e tamanho) | e2e | `apps/api/src/modules/pericia/importacao.router.e2e.test.ts` |
| IMP-01.4 (salvar cria partes) | e2e | `apps/api/src/modules/pericia/parte.router.e2e.test.ts` |
| IMP-02.1 (modelo) | unit | `packages/contracts` (`CSV_IMPORT_COLUMNS`) + web `pericias/import` |
| IMP-02.2–3 (lote, relatório, reaproveitamento) | unit + e2e | `importacao.service.unit.test.ts` (`parseCsv`, linha → perícia), `importacao.router.e2e.test.ts` (3 criadas, 1 ignorada, 1 recusada) |
| IMP-03.1–3 (cadastro, escolher/criar, perícias da parte) | e2e | `parte.router.e2e.test.ts` |
| IMP-04.1–2 (campos, período sugerido) | unit + e2e | `packages/contracts/src/schemas/pericia.schema.unit.test.ts`, `parte.router.e2e.test.ts` (criação grava o período) |

## Tasks

- [x] **T1** Contratos e models: `Parte` (`packages/db/src/models/parte.model.ts`, `packages/contracts/src/schemas/parte.schema.ts`), `partes` e campos trabalhistas na perícia, `autor`/`reu` removidos, `sugerirPeriodoImprescrito`, `importacao.schema.ts` (`CSV_IMPORT_COLUMNS`), índice de busca (`partes.nome`, `parte_text`).
- [x] **T2** API `parte.*` (router/controller/service/repository/schema), resolução de partes em `createPericia`/`updatePericia`, cópia do nome ao renomear, `findResumosByIds` derivando autor/réu, período imprescrito na criação. Testes.
- [x] **T3** API `importacao.*`: `extrairAta`, `POST /pericias/import/pdf` (unpdf), `parseCsv` + `POST /pericias/import/csv`. Chaves de mensagem novas. Testes unit + e2e.
- [x] **T4** Seed de demonstração com partes e dados trabalhistas; `apps/api/CLAUDE.md` (ownership) e `DB_OWNERSHIP`.
- [x] **T5** Web: `postFile`, `query/parte.ts`, formulário com partes e grupo trabalhista, detalhe, "Preencher com PDF" no `add`.
- [x] **T6** Web: `pericias/import/` (modelo, envio, relatório) e `partes/` (lista, criar, detalhe, perícias) + navegação.
- [x] **T7** Verificação: `pnpm run check`, build do web, UAT no navegador (`ACC.md`), `validation.md`.
