# Preencher com vários PDFs — Design

- **API**: nenhuma rota nova. Cada PDF vai sozinho para o `POST /expert-cases/import/pdf` que já existe (rascunho, faltantes, avisos, serviço já cadastrado). O ZIP sai da rota e de `extractPdfText` (`apps/api/src/modules/case/import.service.ts`), com a chave `zip_without_pdf` (AD-183).
- **Web** (`apps/web/src/routes/_private/expert-cases/add/`):
  - `@hooks/use-pdf-fill.ts` — arquivos e a leitura em fila (um por vez, para não pesar no servidor), etapa atual, escolhas por campo, partes marcadas e `fill()` que aplica no formulário (`form.reset({...valores atuais, ...escolhidos})`).
  - `@utils/pdf-choices.ts` — funções puras: opções por campo (valores distintos com o arquivo de origem), partes sem repetição (polo + tipo + nome normalizado) e o rascunho final. Tribunal leva junto a justiça do mesmo arquivo.
  - `@components/pdf-fill-dialog.tsx` — `FormDialog` com as etapas e o `Progress`; etapa 1 no visual do `file-upload-06` (área tracejada de soltar + lista com ícone, nome e barra), etapa 2 com `Select` por campo e `Checkbox` por parte, etapa 3 com o resumo.
  - Sai `@hooks/use-pdf-import.ts` e `@components/pdf-import-notice.tsx` (avisos e faltantes passam para dentro da janela).
