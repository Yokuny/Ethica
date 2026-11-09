---
feature: Biblioteca de modelos
slug: biblioteca-modelos
descricao: Modelos de laudo em Biblioteca padrão e Biblioteca do escritório por área de atuação, importar PDF ou Word e layout da perita como padrão
data: 2026-11-09
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-203, AD-204, AD-205]
spec: [.specs/features/biblioteca-modelos]
branches: [main]
---

# Biblioteca de modelos

**Status**: concluido · **Atualizado**: 2026-11-09 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='biblioteca-modelos'`.

## O que foi feito

- **Modelos** (`/expert-reports/templates`) em duas abas: **Biblioteca padrão** (Laudo pericial trabalhista, Parecer técnico, Impugnação de laudo pericial trabalhista e Laudo pericial NR-15/NR-16, só leitura) e **Biblioteca do escritório**, agrupada por área de atuação.
- **Área de atuação** = tipo de serviço: Perícia trabalhista, cível, federal, Assistência técnica, Parceria, Serviço particular e os tipos próprios. Escolhida ao criar, importar ou "Usar no escritório"; muda em "Editar nome e detalhes". Salvar um laudo como modelo usa a área do serviço. No "Novo laudo", os modelos da área do serviço aparecem primeiro.
- **Usar no escritório** (detalhe do modelo padrão): copia o modelo para a Biblioteca do escritório, com o mesmo nome e a área dele.
- **Importar modelo** (PDF ou Word): títulos numerados ou de estilo Título viram itens e subitens; o sumário é ignorado; no Word ficam negrito, itálico, sublinhado, listas e tabelas. Abre o modelo para editar e reorganizar.
- **Layout da perita** como padrão (PDF e Word): capa com logo, título grande, data da vistoria e local, quadro do processo, data e assinatura à direita; sumário; abertura ao juiz; títulos em azul-marinho com traço; "É o laudo." no fim. Personalizável no "Layout".

## Por que

Pedido da perita (2026-11-09), com o laudo `ETH-2026-001` como layout. As escolhas foram dela: área pelos tipos de serviço, importar PDF e Word, manter o modelo NR-15/NR-16, layout do anexo também nos importados (`spec.md`, "Assumptions").

Não desfazer sem ler: a área guarda a chave ou o nome do tipo próprio (AD-204); o layout padrão mudou para todos os modelos e laudos sem layout gravado (AD-203); o leitor de Word usa só `fflate` e `htmlparser2` (AD-205).

## Como

### `apps/api`

- `apps/api/src/modules/documents/report.attachment.ts` — `templateSectionsFromText` (ignora sumário) e `templateSectionsFromDocx`.
- `apps/api/src/modules/documents/template.service.ts` — `importTemplate`; área no criar, editar e salvar como modelo (`report.service.saveAsTemplate`).
- `apps/api/src/modules/documents/report.router.ts` — `POST /expert-reports/templates/file` (`importTemplateQuerySchema`).
- `apps/api/src/modules/documents/report.library.ts` — áreas, nomes e ordem dos modelos padrão.
- `apps/api/src/modules/documents/report.templates.ts` e `report.docx.ts` — capa, abertura, fecho, sumário e títulos no layout da perita.

### `apps/web`

- `apps/web/src/routes/_private/expert-reports/templates/index.tsx` — abas (`?library=`), grupos por área, "Importar modelo" e "Novo modelo".
- `apps/web/src/routes/_private/expert-reports/templates/@components/template-import-form.tsx` e `@hooks/use-template-import-form.ts`.
- `apps/web/src/components/report-labels.ts` — `templateAreaLabel`, `templateAreaItems`.
- `apps/web/src/routes/_private/expert-reports/@components/template-select.tsx` — modelos da área primeiro.

### `packages`

- `packages/contracts/src/schemas/report.schema.ts` — `TEMPLATE_AREAS`, `caseArea`, `TEMPLATE_IMPORT_MIMES`, `REPORT_LAYOUT_DEFAULT`, `area` nos schemas de modelo.
- `packages/db/src/models/template.model.ts` — `area`. Sem migração.

## Como testar

```
pnpm vitest run apps/api/src/modules/documents
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: Modelos → Biblioteca do escritório → Importar modelo com um Word que tenha sumário, títulos e tabela; Biblioteca padrão → Parecer técnico → Usar no escritório; Novo laudo de uma perícia trabalhista mostra os modelos da área primeiro; Exportar PDF e Word de um laudo do modelo padrão.

## Pendências

- [ ] Conferir em produção o PDF com a fonte Source Sans (o Mac de desenvolvimento cai para Arial).
- [ ] Cidade antes da data ("Itajaí/SC, ...") precisa de um campo de cidade do escritório (AD-203).
- [ ] Imagens do Word importado (AD-205).

## Histórico

- 2026-11-09 — Implementado BIB-01 a BIB-06 (AD-203 a AD-205); conferido na tela local (abas, importar Word com sumário, PDF do laudo padrão).
