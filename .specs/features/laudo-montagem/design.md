# Montagem do laudo — Design

Spec: `.specs/features/laudo-montagem/spec.md`. Defaults da tabela "Assumptions" confirmados pela perita em 2026-11-01 ("segue").

## Visão geral

Tudo fica no módulo `documents` (dono de `Report`/`Template`, AD-126). Nenhuma tag nova na allowlist do HTML (AD-123): o quadro de fotos é uma `table` comum.

| Req | Mudança | Onde |
| --- | --- | --- |
| LMO-01 | O laudo guarda de onde veio (`templateId` no laudo, `templateSectionId` em cada seção). Uma rota só, `PUT /expert-reports/:id/sections`, recebe o modelo e as seções marcadas e remonta a lista: seção que continua marcada com a mesma variante **mantém o texto editado**; nova vem do modelo com as variáveis resolvidas; desmarcada sai. Trocar o modelo é a mesma chamada com outro `templateId` (tudo vem novo). | `report.service.chooseSections`, `report.repository.replaceSections`, contrato `chooseReportSectionsSchema` (= `createReportSchema` sem `caseId`) |
| LMO-02 | A biblioteca já tem NR-15 (anexos 1 a 14) e NR-16 (1 a 5 + radiações). Entram: "Dados do contrato de trabalho" (variáveis trabalhistas), "Local periciado e presentes", "Documentos analisados" (PGR/PPRA, PCMSO, LTCAT, fichas de EPI), "Fundamentação legal" e "Anexo 13-A — Benzeno". Texto-base para revisão da perita (AD-127). | `report.library.ts` |
| LMO-03 | `POST /expert-reports/:id/process` com o PDF no corpo (como a ata, AD-118, até 50 MB). Lê o texto pelo `extractPdfText` de `case/import.service` e aplica `extractProcess` (regras, AD-152): quesitos por polo e do juízo, admissão, demissão, função, local, pedidos (adicionais e agentes). Grava no rascunho: quesitos nas seções "Quesitos …" (pelo título: "Juízo", denominação do autor ou do réu) trocando o texto-modelo "(transcrever o quesito)" ou acrescentando ao fim; pedidos acrescentados em "Objetivo". Devolve o laudo, os dados trabalhistas achados e o que faltou; a tela oferece "Salvar na perícia" (PATCH da perícia, que já existe). | `report.process.ts` (função pura) + `report.service.fillFromProcess` |
| LMO-04 | `GET /:id/pdf?preview=true` gera o PDF sem a trava de pendências (marcadores ficam visíveis no texto). A tela abre o PDF num diálogo (`iframe` com o blob). Download em PDF e Word continua no menu. | `report.service.generatePdf`, `report-preview-dialog.tsx` |
| LMO-05 | Botão "Quadro de fotos" no editor: diálogo com título, fotos da vistoria (marcar) e envio de fotos novas, legenda por foto. Insere `<table>` com linha de título (`th colspan=2`) e linhas de 2 células (`img` + legenda em `p`); a cada 6 fotos, um novo quadro. Fotos novas vão para `POST /expert-reports/:id/media` (JPEG, reduzidas no navegador como as da vistoria, sem carimbo), guardadas em `tenants/<t>/cases/<caseId>/reports/<reportId>/<mediaId>` com a cota do escritório (AD-120, AD-146) e listadas em `report.media`. `REPORT_IMG_SRC` passa a aceitar `/expert-reports/<id>/media/<uuid>`; PDF e Word desenham a foto dentro da célula em tamanho de meia página. Excluir o laudo apaga as fotos dele e devolve a cota. | contrato, `report.service` + `report.repository`, `report.docx.ts`, `report.templates.ts`; `rich-text-editor.tsx` + `photo-grid-dialog.tsx` |

## Decisões de design

- **Uma rota para marcar/desmarcar/trocar modelo** em vez de "acrescentar seção" + "trocar modelo": o seletor que já existe (`SectionsPicker`) é reaproveitado no diálogo, e a regra de manter o texto editado fica num lugar só.
- Laudos criados antes não têm `templateSectionId`: sem migração (AD-141, seed refeito). No diálogo, seção sem origem conta como desmarcada.
- Quesitos achados pelo título da seção: simples e funciona para os modelos clonados do padrão; modelo do escritório com título diferente recebe o aviso "não achado".
- Fotos do laudo ficam no próprio documento do laudo (`media[]`), não num registro novo.

## Pendências conhecidas

- Excluir a perícia apaga os laudos por evento (`case:deleted`), mas, como já acontece com as fotos da vistoria, não apaga os arquivos do storage.
