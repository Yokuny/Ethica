---
feature: Fundação do Ethica
slug: fundacao-ethica
descricao: Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção
data: 2026-10-29
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db, packages/ui, harness, docs, infra, tests]
decisoes: [AD-001, AD-038, AD-039, AD-036, AD-102, AD-103, AD-104, AD-105, AD-106, AD-107]
spec: [.specs/features/fundacao-ethica]
---

# Fundação do Ethica

**Status**: parcial · **Atualizado**: 2026-10-29 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `packages/ui`, `harness`, `docs`, `infra`, `tests`

> Documento vivo. Onde divergir do plano (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='fundacao-ethica'`.

## O que foi feito

- Login, convite de equipe, conta (foto/nome/senha), usuários (admin) e tenant suspenso, portados do checkduplo.
- Perícias: listagem com busca (Atlas Search), filtros de etapa e justiça e faixa de indicadores; cadastro; detalhe com edição, exclusão (admin), próximos compromissos e lançamentos da perícia.
- Agenda: calendário mês/semana/dia de vistorias, audiências e reuniões; criar, editar, concluir, cancelar e remover em `FormDialog`. Prazos passaram a ser entidade da perícia (ver `prazos-recebimentos`).
- Financeiro (admin/manager): lançamentos de receita e despesa (honorário com parcelas desde `prazos-recebimentos`), resumo do mês, fluxo de caixa mensal e totais por categoria em gráficos; honorário fixado vira receita a receber automaticamente.
- Prospecção: busca de processos na API Pública do Datajud por tribunal/termo/órgão julgador, salvar como oportunidade, acompanhar status e converter em perícia.
- Início com indicadores, próximos compromissos, fluxo de caixa e perícias por etapa/justiça.

## Por que

Começar o produto de gestão de perícias já com a arquitetura, o harness e a identidade do checkduplo, sem herdar o domínio de CRM (AD-102). As decisões herdadas mantêm o número para que skills e comentários continuem válidos.

## Como

### `apps/api`

- `apps/api/src/app.ts` — composition root; injeta o `datajudClient` quando há `DATAJUD_API_KEY`.
- `apps/api/src/modules/{identity,pericia,agenda,financeiro,prospeccao}/` — módulos contidos (AD-038).
- `apps/api/src/events/` — `pericia:honorarios_fixados` com subscriber em `events/subscribers/` (AD-106; `pericia:created` removido pela AD-109).
- `apps/api/src/providers/datajudClient.ts` — consulta e mapeamento do Datajud (AD-105).
- `apps/api/scripts/seed-demo.ts` — tenant de demonstração.

### `apps/web`

- `apps/web/src/routes/_private/{index,pericias,agenda,financeiro,prospeccao}/` — telas no padrão `ethica-web-standards`.
- `apps/web/src/components/form-fields.tsx` — campos default de formulário (texto, select, dinheiro, data, hora, número, textarea).
- `apps/web/src/components/{fluxo-financeiro-chart,upcoming-compromissos,hub-illustration,date-picker}.tsx` e `*-labels.ts`.
- `apps/web/src/query/{pericia,compromisso,lancamento,listStats}.ts` — camada de dados compartilhada.

### `packages/contracts`

- `packages/contracts/src/schemas/{pericia,compromisso,lancamento,prospeccao,date}.schema.ts` — payloads e enums do domínio.

### `packages/db`

- `packages/db/src/models/{pericia,compromisso,lancamento,oportunidade}.model.ts`, `packages/db/src/time.ts`, índice de busca `pericia_text` em `textSearch.ts`.

### `packages/ui`

- `packages/ui/src/components/chart.tsx` — primitivo de gráfico (AD-104).

### `harness`

- `AGENTS.md` (fonte única), `CLAUDE.md`, `GEMINI.md` → `AGENTS.md`; skills `ethica-*` em `.agents/skills/` com symlink em `.claude/skills/`; skills de design, `tlc-spec-driven`, `playwright-skill`, `browser-harness`; hooks em `.claude/settings*.json`; `.mcp.json` e `.vscode/`.

### `docs`

- `PRODUCT.md`, `RUN_BOOK.md`, `docs/{architecture,glossary,roadmap}.md`, `.specs/STATE.md`.

### `infra`

- `docker-compose.yml` (mongo Atlas Local + api + web), `Dockerfile.dev`, `.github/workflows/ci.yml` (gate `pnpm run check` + `pnpm docs:check`), `ops/grafana/api-dashboard.json`.

### `tests`

- `tests/structural/` — fronteiras de módulo, `mongoose` só no `packages/db`, registry de schemas.

## Como testar

```
pnpm vitest run --project unit --project structural
docker compose up -d mongo && pnpm vitest run
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: `pnpm --filter api run seed:demo`, entrar como `admin@pericias.example.com` e percorrer início, perícias, agenda, financeiro e prospecção (RUN_BOOK.md).

## Pendências

- [ ] Rodar `integration`/`e2e` com o Mongo local (não executados na criação: sem Docker na sessão).
- [ ] Testes e2e de router para `pericia`, `agenda`, `financeiro` e `prospeccao` (hoje: unit de service e provider).
- [ ] Validar a consulta ao Datajud com a chave real (AD-105).
- [ ] UAT visual de todas as telas com o seed de demonstração.
- [ ] Tenant com CPF (perito pessoa física): `provisionTenantSchema` hoje exige CNPJ.

## Histórico

- 2026-11-01 — Papéis fixos de domínio (AD-107) viraram a matriz de permissões por membro; `financeiro/route.tsx` saiu para a guarda central (`docs/features/gestao-escritorio/feature.md`, AD-137).
- 2026-10-31 — Prazo do laudo vira `Prazo` da perícia, `pericia:created` sai e honorário ganha parcelas (`docs/features/prazos-recebimentos/feature.md`, AD-109, AD-111).
- 2026-10-29 — Fundação criada a partir do repo `CRM` (checkduplo) (`.specs/features/fundacao-ethica/plans/2026-10-29-fundacao-ethica.md`, AD-102).

## Referências

- Plano: `.specs/features/fundacao-ethica/plans/`
