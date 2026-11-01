# Montagem do laudo — Tasks

Gate de cada task: `pnpm run check` (+ `(cd apps/web && pnpm run build)` quando o web muda). Um commit por task.

| # | Task | Req | Verificação |
| --- | --- | --- | --- |
| T1 | Origem no laudo (`templateId`, `templateSectionId`), `PUT /:id/sections` (manter texto editado, novas resolvidas, trocar modelo) e diálogo "Seções do modelo" no detalhe | LMO-01 | unit do `chooseSections`; e2e da rota; tela: desmarcar, marcar, trocar modelo |
| T2 | Seções novas na biblioteca trabalhista | LMO-02 | unit da biblioteca (variáveis válidas); tela: modelo padrão |
| T3 | `?preview=true` no PDF e diálogo "Visualizar PDF" | LMO-04 | e2e: preview com pendência responde 200; tela |
| T4 | Fotos do laudo (upload, leitura, exclusão), `REPORT_IMG_SRC`, foto na célula no PDF/Word, "Quadro de fotos" no editor | LMO-05 | unit do docx (foto na célula); e2e upload/leitura; tela: quadro 2x3, exportar PDF e Word |
| T5 | `extractProcess` + `POST /:id/process` + diálogo "Preencher pelo processo" com "Salvar na perícia" | LMO-03 | unit do `extractProcess`; tela com PDF de teste |
| T6 | Registro: `feature.md`, validação, docs:sync | — | `pnpm docs:check` |
