# Anexar laudo — Design

- **Dado**: `Report.file = { key, name, bytes }` (`packages/db/src/models/report.model.ts`). Laudo anexado = tem `file`, nasce `completed`, sem itens, `templateName` = nome do arquivo sem `.pdf`. O `ReportRecord` devolve `file: { name, bytes }`; a chave do armazenamento fica no servidor (como as fotos, LMO-05).
- **Envio**: `POST /expert-reports/file?caseId=&name=&recordDelivery=true` com o PDF no corpo (`fileBody`, AD-118), permissão `expert_reports.create`. Cota reservada antes (AD-120); chave `tenants/<t>/reports/files/<uuid>.pdf`.
- **Entrega**: o trecho de "Registrar a entrega" de `completeReport` vira `recordDelivery(ctx, legalCase, notes)`, usado pelos dois.
- **PDF**: `generatePdf` devolve o arquivo guardado quando há `file` (Visualizar e Exportar funcionam sem mudança na tela); Word responde `not_found`.
- **Excluir**: `deleteReport` aceita rascunho **ou** anexado (`removeDraft` vira `remove` com filtro `status: 'draft'` ou `file` existente) e devolve a cota do arquivo.
- **Modelo**: `saveAsTemplate` com `file` lê o texto do PDF (`importService.extractPdfText`) e `templateSectionsFromText` (`apps/api/src/modules/documents/report.attachment.ts`) separa títulos numerados em itens (nível = quantidade de números).
- **Tela**: `case-reports.tsx` com os dois botões; `attach-report-dialog.tsx` (arquivo + "Registrar a entrega") seguido do `SaveTemplateDialog`, movido para `expert-reports/@components/` por ser usado em dois lugares. No detalhe, laudo anexado mostra o nome do arquivo no lugar dos itens e o "…" só com Salvar como modelo, Exportar PDF e Excluir.
