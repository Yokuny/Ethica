# Base de documentos — Tasks

**Design**: `.specs/features/documentos-pdf/design.md` · AD-119 a AD-122.

| # | Tarefa | Req | Verificação |
| --- | --- | --- | --- |
| T1 | Contratos: perfil profissional, `documento.schema.ts`, movimentações; mensagens novas | DOC-01..04 | `pnpm vitest run packages/contracts` |
| T2 | Models: `Tenant` (cabeçalho, rodapé, logo, storageBytes, dataExports), `User` (dados profissionais), `Pericia.movimentacoes` | DOC-01, DOC-03, DOC-04 | `tsc` |
| T3 | Providers `pdf` (Chromium) e `storage` (S3) + env + `buildApp` | DOC-01, DOC-02 | `tsc`, env test |
| T4 | Identity: `GET/PATCH /me/profile`; `office.*` (`/tenant/office`, logo com cota, exportações) | DOC-01, DOC-04 | e2e office/account |
| T5 | Pericia: movimentações (rotas, repository) e `listParadas`; funções de exportação nos services | DOC-03, DOC-04 | unit + e2e |
| T6 | Financeiro: `relatorioPeriodo`, `resumoDaPericia`, `listForExport`; agenda e prospecção `listForExport`/`listDaPericia` | DOC-02, DOC-03 | unit |
| T7 | Módulo `documentos`: layout, ficha, checklist, prazos, financeiro, paradas, exportação ZIP, router | DOC-02..04 | unit dos HTML + e2e de permissões |
| T8 | Infra: Dockerfile (chromium), compose (s3 RustFS), `.env.example`, deps, `RUN_BOOK.md` | — | `docker compose up --build` |
| T9 | Seed: dados profissionais, cabeçalho/rodapé, movimentações (com perícia parada) | — | `seed:demo` |
| T10 | Web: conta (dados profissionais), `_admin/office`, detalhe da perícia (PDFs + movimentações), `/relatorios`, `getFile`, traduções | DOC-01..04 | `check` + build |
| T11 | Gate: `pnpm run check`, build do web, UAT (operador e admin, desktop e celular) | todos | `validation.md` |
