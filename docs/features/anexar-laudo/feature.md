---
feature: Anexar laudo
slug: anexar-laudo
descricao: Laudo feito fora do Ethica anexado em PDF no serviço, concluído com a entrega e salvável como modelo
data: 2026-11-03
status: concluido
areas: [apps/api, apps/web, packages/db]
decisoes: [AD-179]
spec: [.specs/features/anexar-laudo]
branches: [main]
---

# Anexar laudo

**Status**: concluido · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='anexar-laudo'`.

## O que foi feito

- Na parte de laudos do serviço, dois botões lado a lado: **Anexar PDF / importar laudo** e **Criar a partir de modelo** (o antigo "Iniciar laudo"). Só aparecem para quem pode criar laudo.
- **Anexar**: escolhe o PDF, confirma com "Registrar a entrega" (marcado) e o laudo entra **Concluído** com o nome do arquivo, na lista do serviço (ícone de clipe) e na tela Laudos. A entrega cumpre o prazo "Entrega do laudo", lança a movimentação e avança a fase, como concluir um laudo do Ethica.
- Logo depois, pergunta "Salvar este laudo como modelo na biblioteca?": os títulos numerados do PDF ("1. OBJETIVO", "2.1 Metodologia") viram itens e subitens, com o texto de cada um; o que vem antes do primeiro título vira um item sem número com o nome do arquivo. Também fica no "…" do laudo anexado.
- **Laudo anexado aberto**: mostra o nome do arquivo; Visualizar PDF e Exportar PDF devolvem o arquivo enviado; sem Word e sem itens; "Excluir laudo" no "…" (volta para o serviço).

## Por que

Pedido da perita (2026-11-03). Ela escolheu: "importar laudo" é o mesmo que anexar o PDF, com a pergunta de salvar como modelo; o anexado fica concluído e com a entrega registrada; botões lado a lado. Decisões técnicas em AD-179.

## Como

### `apps/api`

- `apps/api/src/modules/documents/report.service.ts` — `attachReport` (cota reservada antes, AD-120), `fileDelivery` (o "Registrar a entrega" de `completeReport`, agora usado pelos dois), `attachedPdf` no `generatePdf`, Word 404, `deleteReport` aceita rascunho ou anexado, `saveAsTemplate` do anexado lê o texto do PDF (`importService.extractPdfText`).
- `apps/api/src/modules/documents/report.attachment.ts` — `templateSectionsFromText` (títulos numerados → itens).
- `apps/api/src/modules/documents/report.repository.ts` — `fileOf` e `remove` (substitui `removeDraft`).
- Rota nova: `POST /expert-reports/file?caseId=&name=&recordDelivery=true` com o PDF no corpo (`attachReportQuerySchema`).

### `apps/web`

- `apps/web/src/routes/_private/expert-cases/details/@components/case-reports.tsx` e `attach-report-dialog.tsx`.
- `apps/web/src/routes/_private/expert-reports/@components/save-template-dialog.tsx` (saiu de `details/@components/`, agora usado também no serviço).
- `apps/web/src/routes/_private/expert-reports/details/index.tsx` e `report-preview-dialog.tsx` — laudo anexado.
- `apps/web/src/query/report.ts` — `attachReportMutation`, `ReportRecord.file`.

### `packages`

- `packages/db/src/models/report.model.ts` — `Report.file` (`key`, `name`, `bytes`). Sem migração.

## Como testar

```
pnpm vitest run apps/api/src/modules/documents
pnpm run check && (cd apps/web && pnpm run build)
```

- Serviço → Laudos → Anexar PDF / importar laudo → escolher um PDF → Anexar → Salvar como modelo; abrir o laudo, Visualizar PDF, Excluir laudo.

## Pendências

- [ ] Conferência visual no navegador (não feita nesta entrega).
- [ ] PDF escaneado (sem texto) anexa, mas não vira modelo (aviso "PDF sem texto").
- [ ] Excluir o anexado não reabre o prazo "Entrega do laudo" já cumprido.

## Histórico

- 2026-11-03 — Implementado ANL-01 a ANL-04 (AD-179). Spec em `.specs/features/anexar-laudo/spec.md`.
