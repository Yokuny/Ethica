# Plano — fundação do Ethica a partir do checkduplo (CRM)

Data: 2026-10-29 · Origem: pedido do usuário para trazer harness, skills, arquitetura do front e do back,
layout e configurações do repo `CRM` (checkduplo) para um projeto novo de gestão de perícias.

## Escopo

- Monorepo pnpm só com `apps/api` (back) e `apps/web` (front) + `packages/{contracts,db,ui}`.
  Fora: `ai-gateway`, `site`, `field-engine`, `ai-kit`, evals.
- Harness: `AGENTS.md`/`CLAUDE.md`/`GEMINI.md`, skills do projeto (`ethica-*`), skills de design,
  `.claude/settings*.json`, hooks, `.vscode`, `.mcp.json`, CI, `scripts/docs/sync-docs.mjs`,
  `docs/` (gateway, templates, glossário, arquitetura) e `.specs/` (STATE com ADs herdadas).
- Back-end: módulos contidos (`identity` portado) + event bus in-process + módulos novos de domínio:
  `pericia`, `agenda`, `financeiro`, `prospeccao` (Datajud).
- Front-end: shell (sidebar, dock, command menu), auth/convite/suspenso, conta, usuários (admin) e
  páginas novas: início com gráficos, perícias (listagem, add, detalhe/edição), agenda (calendário mês/semana),
  financeiro (hub, lançamentos, relatórios com gráficos), prospecção (busca Datajud + oportunidades).
- Componentes default: `page-card`, `data-table`, `record`, `panel`, `link-list`, `link-card`,
  `default-*`, `form-dialog`, `confirm-dialog`, `money-input`, `date-picker` + `chart` (recharts) no `packages/ui`.

## Passos

1. Copiar arquivos versionados do CRM e podar o domínio de CRM.
2. Renomear escopo `@crm/*` → `@ethica/*`, `crm-api` → `api`, marca.
3. Contracts: schemas de perícia, compromisso, lançamento, oportunidade, busca Datajud.
4. DB: models `Pericia`, `Compromisso`, `Lancamento`, `Oportunidade` + índice de busca.
5. API: módulos novos (router/controller/service/repository/schema), eventos `pericia:created` e
   `pericia:honorarios_fixados`, provider `datajudClient`.
6. Web: rotas novas no padrão `ethica-web-standards`; i18n; gráficos.
7. Docs: `PRODUCT.md`, `RUN_BOOK.md`, `docs/*`, `feature.md` da fundação, `STATE.md`.
8. Gate: `pnpm install`, `tsc`, `biome`, `vitest` (unit/structural), `vite build`.
