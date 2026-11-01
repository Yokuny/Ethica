---
feature: Gestão do escritório
slug: gestao-escritorio
descricao: Matriz de permissões por membro, diário de bordo, fase e situação da perícia, honorário do assistente técnico e início configurável
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db, harness]
decisoes: [AD-103, AD-113, AD-121, AD-126, AD-133, AD-134, AD-135, AD-136, AD-137, AD-138]
spec: [.specs/features/gestao-escritorio]
branches: [feat/gestao-escritorio]
---

# Gestão do escritório

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `harness`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='gestao-escritorio'`.

## O que foi feito

- **Matriz de permissões por membro**: cada membro tem módulo × ação (ver, inserir, editar, excluir). No convite o admin escolhe o perfil (Gestor ou Operador), a matriz vem com o preset dele e pode ser ajustada; em Usuários, "Permissões" ajusta depois. O admin tem tudo e é o único em usuários, escritório, diário e exportação. Menu, rotas, botões, blocos do início e valores financeiros seguem a matriz.
- **Diário de bordo** (`/activity-log`, só admin): quem, quando, módulo, ação e registro (com link quando há detalhe) de toda escrita, exportação e entrada no sistema, com filtros de período, pessoa, módulo e ação; guarda de 1 ano. As últimas exportações do escritório vêm do diário.
- **Fase detalhada e situação da perícia**: além da etapa, uma fase opcional (ex.: "Respondendo impugnação") e a situação ativa, suspensa (desistência, destituição, acordo) ou encerrada, calculada no servidor; filtros por situação e fase na listagem. Concluir o laudo com a entrega põe a fase "aguardando manifestação das partes". Suspensa não conta como parada.
- **Assistente técnico**: na perícia de assistente, uma das partes é marcada como contratante e o honorário vira "honorário contratado", lançado no financeiro como "Honorários contratados" com o contratante na listagem e no relatório financeiro.
- **Início configurável**: "Personalizar" mostra ou esconde cada bloco permitido, por pessoa, com "Restaurar padrão"; bloco novo "Perícias paradas" com as mais antigas e o link para o relatório.

## Por que

Onda 6 da gap analysis (`.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md`). A matriz por membro com preset atende a AD-108 sem segunda camada (AD-137); as etapas ficam porque alimentam gráficos, regra de parada e laudo, e a fase entra ao lado delas com situação derivada, nunca gravada (AD-133). O diário é um middleware único que lê método e caminho, para não tocar cada controller (AD-134). O honorário do assistente reaproveita o campo e o evento do honorário fixado (AD-135). A preferência do início guarda os blocos ocultos, então bloco novo aparece sem migração (AD-136). Sem migração de dados: o sistema está em desenvolvimento e o seed foi refeito.

## Como

### `apps/api`

- `apps/api/src/middlewares/authorization.middleware.ts` — `can(module, ...actions)`; `authentication.middleware.ts` resolve `req.tenantUser.permissions` (`effectivePermissions`). Todos os routers de domínio usam `can`; o mapa está em `node .agents/skills/ethica-permissions/scripts/matrix.mjs api`.
- `apps/api/src/modules/identity/auth.*` — `PATCH /auth/users/:id/permissions`, sessão e diretório com permissões; `platform.service.ts`/`invite.*` levam a matriz do convite ao usuário.
- `apps/api/src/middlewares/activityLog.middleware.ts` (`describeRequest`) montado em `apps/api/src/app.ts` com `activityLogService.record`; `apps/api/src/modules/identity/activityLog.*` (`GET /tenant/activity-log`); o login registra em `auth.service.ts`; `office.service.ts` lê as exportações do diário.
- `apps/api/src/modules/case/case.service.ts` — `resolveStatusAndPhase`, contratante válido, categoria do honorário no evento; `case.repository.ts` — situação na leitura e no filtro, paradas sem suspensas; `GET /expert-cases/stalled`.
- `apps/api/src/modules/finance/transaction.*` — `contracted_fees` e contratante no enriquecimento e no relatório.
- `apps/api/src/modules/documents/report.service.ts` — fase ao concluir com a entrega; controllers de `documents` decidem valores pela matriz.
- `apps/api/src/modules/identity/preferences.*` — `hiddenBlocks`.

### `apps/web`

- `apps/web/src/query/session.ts` (`can`), `apps/web/src/routes/_private/route.tsx` (guarda central por módulo, `moduleFromRoute` em `_private/@utils/home-access.ts`); `finance/route.tsx` removido.
- `apps/web/src/routes/_private/_admin/users/` — `PermissionsMatrix`, diálogo de permissões e matriz no convite.
- `apps/web/src/routes/_private/_admin/activity-log/` — tela do diário.
- `apps/web/src/routes/_private/expert-cases/` — fase, situação, contratante e filtros; `apps/web/src/components/case-labels.ts`.
- `apps/web/src/routes/_private/index.tsx` e `@components/home-customize.tsx`, `@components/stalled-cases.tsx`, `@consts/home-blocks.ts`; `apps/web/src/query/preferences.ts` (antes em `account/@query`).

### `packages`

- `packages/contracts/src/schemas/permission.schema.ts` (módulos, ações, presets), `activityLog.schema.ts`, `case.schema.ts` (fases, situação, contratante), `account.schema.ts` (`HOME_BLOCKS`), `transaction.schema.ts` (`contracted_fees`).
- `packages/db/src/models/activity.model.ts` (TTL de 1 ano); `user.model.ts`/`invite.model.ts` (`permissions`); `case.model.ts` (`phase`, `parties[].client`); `tenant.model.ts` sem `dataExports`.

### `harness`

- `.agents/skills/ethica-permissions/SKILL.md` e `scripts/matrix.mjs` descrevem a matriz.

## Como testar

```
pnpm vitest run packages/contracts apps/api/src/middlewares apps/api/src/modules/identity apps/api/src/modules/pericia apps/api/src/modules/financeiro apps/web
pnpm run check && (cd apps/web && pnpm run build)
```

- Banco local: `pnpm --filter api run seed:demo`. UAT: `.specs/features/gestao-escritorio/validation.md`.

## Pendências

- [ ] Entradas do diário de ajuste de permissões e de exclusões ficam sem rótulo legível (só o id).
- [ ] A exportação ZIP (AD-122) não inclui o diário de bordo.
- [ ] Ordem dos blocos do início não é configurável.
- [ ] Trocar papel e desativar membro continuam sem rota (só no banco) — spec em `gestao-membros` (AD-148).

## Histórico

- 2026-11-01 — CRUD de membros só do admin especificado em `gestao-membros` (AD-148).
- 2026-11-01 — Caminhos e nomes de código citados aqui passam ao inglês (feature `english-naming`, AD-139/AD-140).
- 2026-11-01 — Rotas do web e da API, pastas de rota e valores da matriz e do diário passam a inglês, traduzidos no web (AD-138).
- 2026-11-01 — Implementado GES-01 a GES-06 (AD-133 a AD-137); validação em `.specs/features/gestao-escritorio/validation.md`. Divergências do design: a regra do contratante ficou só no service (refine no schema quebraria o `.pick()` da conversão de oportunidade); o bloco de paradas leva ao relatório em PDF em vez de um filtro da listagem; rótulos da matriz e do diário viraram mapas de chave literal (o teste do dicionário proíbe chave montada); `preferencesQuery` subiu para `apps/web/src/query/`; a coluna de honorários da listagem some sem `finance.view` (achado na UAT).
- 2026-11-01 — Spec criada (`.specs/features/gestao-escritorio/spec.md`).

## Referências

- Spec/design/tasks/validação: `.specs/features/gestao-escritorio/`
- Origem: `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (onda 6)
