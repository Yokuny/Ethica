# Biblioteca de modelos — Design

Decisões: AD-203 (layout do anexo como padrão), AD-204 (área de atuação do modelo), AD-205 (importar PDF e Word).

## Área de atuação (BIB-03, BIB-05)

- `Template.area?: string` (`packages/db`). Valores: as chaves `labor`, `civil`, `federal` (esfera da perícia), `technical_assistance`, ou o **nome** do tipo próprio do escritório (texto em pt-BR, nunca colide com as chaves).
- `packages/contracts/src/schemas/report.schema.ts`: `TEMPLATE_AREAS` (as quatro chaves) e `caseArea(case)` = tipo próprio, senão `technical_assistance` no assistente técnico, senão a esfera. `createTemplateSchema` e `updateTemplateSchema` ganham `area` opcional.
- Salvar um laudo como modelo grava a área do serviço do laudo. Os modelos padrão têm área fixa no código.
- Web: rótulo = `t(area)` para as chaves, o próprio nome para tipo próprio; opções = as quatro chaves + `serviceTypesQuery`.
- `TemplateSelect` recebe `area` e põe os modelos dessa área primeiro (ordem estável no resto).

## Bibliotecas na tela (BIB-01, BIB-02)

- `apps/web/src/routes/_private/expert-reports/templates/index.tsx`: abas Biblioteca padrão / Biblioteca do escritório (search `library`). Padrão: lista dos `isDefault`. Escritório: grupos por área (ordem: as quatro chaves, tipos próprios em ordem alfabética, "Sem área"), botões "Importar modelo" e "Novo modelo" para quem pode criar.
- "Usar no escritório" = o "Duplicar" que já existe no detalhe do modelo padrão (`TemplateCreateForm` com `base`), agora com a área.

## Importar (BIB-04)

- `POST /expert-reports/templates/file?name=&type=&area=` com o arquivo no corpo (`fileBody` aceita PDF e DOCX), permissão `report_templates:create`.
- `report.attachment.ts`: `templateSectionsFromText` passa a ignorar linhas de sumário (pontilhado ou "Sumário"); `templateSectionsFromDocx(buffer, title)` abre o `.docx` com `fflate`, lê `word/document.xml` com `htmlparser2` e monta itens: parágrafo com estilo de título (`Heading N`/`Título N`) ou título numerado abre item; os outros parágrafos, listas e tabelas viram o HTML do item (negrito, itálico, sublinhado). HTML saneado pelo `sanitizeReportHtml`.
- `template.service.importTemplate` cria o modelo do escritório com `REPORT_LAYOUT_DEFAULT`.

## Layout do anexo (BIB-06)

- `REPORT_LAYOUT_DEFAULT` passa a ser o do anexo: Source Sans, entrelinha 1,15, espaço 6 pt, títulos `#1b2a4a`, capa, sumário e abertura. Modelo ou laudo sem layout gravado passa a sair assim.
- `report.templates.ts` (PDF) e `report.docx.ts` (Word): capa com logo do escritório, título grande, "Diligência pericial de [data da vistoria]" e local, quadro Processo/OS/papel → nome, data por extenso e assinatura à direita; sumário com título à esquerda e traço; títulos de item nível 1 em maiúsculas com traço embaixo; abertura com "Processo:" em negrito, título centralizado e data/assinatura à direita; fecho "É o laudo."/"É o parecer." em negrito. Cabeçalho e rodapé seguem os do Escritório.
