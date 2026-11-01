---
feature: Base de documentos
slug: documentos-pdf
descricao: Identidade do escritório, dados profissionais, PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db, infra]
decisoes: [AD-103, AD-107, AD-113, AD-118, AD-119, AD-120, AD-121, AD-122]
spec: [.specs/features/documentos-pdf]
branches: [feat/documentos-pdf]
---

# Base de documentos

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `infra`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='documentos-pdf'`.

## O que foi feito

- **Escritório** (`/office`, só admin): logo, cabeçalho e rodapé dos documentos com marcadores, uso do armazenamento e exportação de dados com as últimas exportações.
- **Dados profissionais** na conta de cada usuário: CPF, registro profissional e formação.
- **PDFs** gerados no servidor com a identidade do escritório: ficha da perícia e checklist de campo (menu "…" do detalhe da perícia); cronograma de prazos, perícias paradas e relatório financeiro do período em `/reports`.
- **Movimentações** da perícia (entrega do laudo, notificação de honorários, intimação para esclarecimentos ou laudo complementar), lançadas no detalhe; definem a perícia parada.
- **Exportação** de todos os dados do tenant em ZIP de CSVs (LGPD), com registro de quem e quando.

## Por que

O perito precisava de papel para a vistoria, relatórios para o escritório e o contador e da identidade do escritório nos documentos técnicos; é também a base do laudo (`laudos`). O PDF é HTML → Chromium headless (AD-119) para que o HTML do editor do laudo vire PDF sem conversão. Arquivos do tenant ficam num storage S3 com cota de 1 GB (AD-120), decidido já para as fotos da onda 5. Cabeçalho/rodapé são texto simples com marcadores e as movimentações são lançadas à mão (AD-121); escopo e formato da exportação na AD-122. Operador não vê valores em nenhum PDF (AD-107).

## Como

### `apps/api`

- `apps/api/src/modules/documents/` — módulo novo (desde `laudos`, dono de `Report` e `Template`, AD-126): `documents.router.ts` (`/documents/*`, papéis por rota), `documents.service.ts` (junta os dados pelos services de `case`, `agenda`, `finance`, `prospecting`, `identity`; CSV e ZIP da exportação), `documents.templates.ts` (um documento = função pura dados → HTML) e `document.layout.ts` (CSS de impressão, escape, rótulos pt-BR e a troca dos marcadores no cabeçalho/rodapé).
- `apps/api/src/providers/pdfRenderer.ts` — Chromium via `puppeteer-core`, um navegador por processo, sem JavaScript na página. `apps/api/src/providers/fileStorage.ts` — bucket privado S3 (`@aws-sdk/client-s3`). Os dois são criados em `apps/api/src/app.ts` e injetáveis nos testes; o CORS expõe `Content-Disposition` para o web ler o nome do arquivo.
- `apps/api/src/modules/identity/office.*` — `/tenant/office` (texto, logo com cota reservada no mesmo update, registro de exportação, identidade para os PDFs). `account.*` ganhou `GET /me/profile` e os dados profissionais.
- `apps/api/src/modules/case/` — `POST/DELETE /expert-cases/:id/movements` e `listStalled` (regra dos 60 dias em `case.service.ts`); funções `listForExport` nos services de cada módulo e `reportPeriod`/`caseSummary` em `finance/transaction.service.ts`.

### `apps/web`

- `apps/web/src/routes/_private/_admin/office/` — tela do escritório; o logo é reduzido no navegador (`@utils/resize-logo.ts`).
- `apps/web/src/routes/_private/reports/` — relatórios em PDF; o financeiro só para admin/manager.
- `apps/web/src/routes/_private/expert-cases/details/` — menu de PDFs e `@components/case-movements.tsx`.
- `apps/web/src/routes/_private/account/` — dados profissionais no formulário de perfil.
- `apps/web/src/lib/api/client.api.ts` (`getFile`) e `apps/web/src/hooks/useFileDownload.ts` — download dos arquivos gerados.

### `packages`

- `packages/contracts/src/schemas/document.schema.ts` (marcadores, limites, cota, dias de perícia parada, período do relatório), `case.schema.ts` (tipos de movimentação), `account.schema.ts` (dados profissionais).
- `packages/db/src/models/tenant.model.ts` (cabeçalho, rodapé, logo, `storageBytes`, `dataExports`), `user.model.ts`, `case.model.ts` (`movements`). Sem migração: seed refeito.

### Infra

- `Dockerfile.dev` instala `chromium` e `fonts-liberation`; `docker-compose.yml` sobe `s3` (RustFS, porque as imagens públicas do MinIO saíram do Docker Hub) e `s3-init`; variáveis em `.env.example`; detalhes em `RUN_BOOK.md`.

## Como testar

```
pnpm vitest run apps/api/src/modules/documentos apps/api/src/modules/identity packages/contracts
```

- UAT: `docker compose up --build -d --renew-anon-volumes api web`, `pnpm --filter api run seed:demo`; admin em `/office` (logo, cabeçalho, exportar), detalhe de uma perícia → "…" → ficha/checklist, `/reports`; repetir como operador (sem financeiro). Evidências em `.specs/features/documentos-pdf/validation.md`.

## Pendências

- [ ] Protocolar o prazo "Entrega do laudo" ou receber parcela não lança movimentação sozinho (AD-121).
- [ ] Imagem de produção da API (hoje só existe `Dockerfile.dev`) precisa do Chromium e das variáveis `S3_*` — spec em `producao-api` (AD-146).
- [ ] Gerar PDF é síncrono na requisição; com volume, avaliar fila ou limite de páginas simultâneas.
- [ ] Número do processo quebra no meio em colunas estreitas das tabelas do PDF.

## Histórico

- 2026-11-01 — Imagem de produção especificada em `producao-api` (AD-146).
- 2026-11-01 — Caminhos e nomes de código citados aqui passam ao inglês (feature `english-naming`, AD-139/AD-140).
- 2026-11-01 — `Tenant.dataExports` saiu: quem exportou vai ao diário de bordo; perícia suspensa não conta como parada; valores dos PDFs seguem a matriz (`docs/features/gestao-escritorio/feature.md`, AD-133, AD-134, AD-137).
- 2026-10-31 — O checklist de campo usa as listas de agentes e documentos do contrato (`INSPECTION_AGENTS`, `INSPECTION_DOCUMENTS`), as mesmas do registro de vistoria (`campo-vistorias`, AD-130); a cota de arquivos agora também é usada pelas mídias da vistoria.
- 2026-10-31 — `document.layout.ts` ganhou `headerFooter`/`textsHeaderFooter` para o laudo e o Word reaproveitarem; o módulo passou a ter os models do laudo (`docs/features/laudos/feature.md`).
- 2026-10-31 — Implementado DOC-01 a DOC-04 (AD-119 a AD-122); validação em `.specs/features/documentos-pdf/validation.md`. Divergências do design: storage local é RustFS em vez de MinIO (imagens públicas do MinIO indisponíveis); o CORS passou a expor `Content-Disposition`, achado na UAT.
- 2026-10-31 — Spec criada (`.specs/features/documentos-pdf/spec.md`).
