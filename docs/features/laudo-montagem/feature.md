---
feature: Montagem do laudo
slug: laudo-montagem
descricao: Seções e modelo editáveis no rascunho, modelo trabalhista completo, pré-preenchimento pelo processo, pré-visualização e fotos 2x3 nos anexos
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts]
decisoes: [AD-114, AD-120, AD-123, AD-126, AD-127, AD-129, AD-152]
spec: [.specs/features/laudo-montagem]
---

# Montagem do laudo

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da verdade.
> Correlação com o git: `git log --oneline -i --grep='laudo-montagem'`.

## O que foi feito

- **Seções do modelo no rascunho** (botão no detalhe do laudo): marca e desmarca seções, troca a variante e troca o modelo. Seção que continua marcada na mesma variante mantém o texto editado; trocar o modelo recomeça. Marcar uma subseção marca a seção-mãe.
- **Modelo trabalhista padrão mais completo**: Dados do contrato de trabalho, Documentos analisados, Reconhecimento dos riscos, Fundamentação legal e Anexo 13-A (benzeno), além dos anexos da NR-15 e NR-16 que já existiam.
- **Preencher pelo processo**: o PDF do processo completo (até 50 MB) põe os quesitos do reclamante, da reclamada e do juízo nas seções "Quesitos …" e os pedidos da inicial no "Objetivo"; admissão, demissão e função aparecem para a perita salvar na perícia. O que não foi achado é listado.
- **Visualizar PDF** antes de concluir, com os dados sem valor entre colchetes, e botões de exportar PDF e Word.
- **Quadro de fotos** no editor: 2 colunas × 3 linhas, título e legenda por foto, com fotos da vistoria ou enviadas no próprio laudo; mais de 6 fotos abre outro quadro.

## Por que

Pedido da perita (2026-11-01). A leitura do processo é por regras sobre o texto, sem IA (AD-152), e nunca é completa: a perita confere. O quadro de fotos é uma tabela comum, que a allowlist do HTML, o PDF e o Word já sabiam desenhar (AD-123), em vez de uma marcação nova. Modelo próprio em Word ficou fora por ora.

## Como

### `apps/api`

- `apps/api/src/modules/documents/report.service.ts` — `chooseSections` (LMO-01), `fillFromProcess` (LMO-03), `uploadMedia`/`getMedia` e a leitura das fotos na exportação (LMO-05), `generatePdf` com `preview` (LMO-04); `deleteReport` apaga as fotos do laudo e devolve a cota.
- `apps/api/src/modules/documents/report.process.ts` — `extractProcess` (regras) e `applyProcess` (o que muda em cada seção).
- `apps/api/src/modules/documents/report.router.ts` — `PUT /:id/sections`, `POST /:id/process`, `PUT|GET /:id/media/:mediaId`, `GET /:id/pdf?preview=true`.
- `apps/api/src/modules/documents/report.library.ts` — seções novas do modelo trabalhista.
- `apps/api/src/modules/documents/report.docx.ts` e `report.templates.ts` — foto na célula com meia largura e colunas iguais.
- `apps/api/src/modules/case/import.service.ts` — `extractPdfText`, usado pela ata e pelo processo.

### `apps/web`

- `apps/web/src/routes/_private/expert-reports/@components/` — `sections-picker.tsx` (agora compartilhado) e `template-select.tsx`.
- `apps/web/src/routes/_private/expert-reports/details/@components/` — `report-sections-dialog.tsx`, `report-preview-dialog.tsx`, `process-fill-dialog.tsx`.
- `apps/web/src/components/photo-grid-dialog.tsx` e o botão "Quadro de fotos" em `rich-text-editor.tsx`; `apps/web/src/lib/offline/photo.ts` reduz a foto sem carimbo quando enviada no laudo.

### `packages`

- `packages/contracts/src/schemas/report.schema.ts` — `chooseReportSectionsSchema`, `REPORT_IMG_SRC` com as fotos do laudo, `REPORT_MEDIA_LIMIT`.
- `packages/db/src/models/report.model.ts` — `templateId`, `sections[].templateSectionId` e `media[]`. Sem migração: laudos antigos não têm a origem das seções (refazer o seed).

## Como testar

```
pnpm vitest run apps/api/src/modules/documents packages/contracts
pnpm run check && (cd apps/web && pnpm run build)
```

- `pnpm --filter api run seed:demo`; Laudos → abrir o rascunho → "Seções do modelo", "Preencher pelo processo", "Visualizar PDF" e, no editor, "Quadro de fotos". Evidências em `.specs/features/laudo-montagem/validation.md`.

## Pendências

- [ ] Texto-base das seções novas precisa de revisão técnica da perita (AD-127).
- [ ] Leitura do processo validada com texto de exemplo; ajustar as regras com processos reais de outros tribunais.
- [ ] Excluir a perícia apaga os laudos, mas não os arquivos de foto do storage (igual às fotos da vistoria).
- [ ] Enviar modelo próprio em Word (fora por pedido da perita).

## Histórico

- 2026-11-01 — Implementado LMO-01 a LMO-05; validação em `.specs/features/laudo-montagem/validation.md`. Divergências do design: a pré-visualização mostra os dados sem valor entre colchetes, sem destaque de cor; a perita é avisada quando há quesitos mas o laudo não tem seção de quesitos marcada; o local de trabalho só é lido quando rotulado ("Local de trabalho:").
- 2026-11-01 — Spec criada (`.specs/features/laudo-montagem/spec.md`).
