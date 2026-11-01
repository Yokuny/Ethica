# Gestão do escritório — Tasks

**Design**: `.specs/features/gestao-escritorio/design.md` · Gate de cada task: `pnpm run check` (ou o subconjunto indicado). O commit é único no fim (gate do AGENTS.md, passo 3).

| # | Task | Req | Verificação |
| --- | --- | --- | --- |
| T1 | Contrato `permissao.schema.ts` (módulos, ações, presets, `permissoesEfetivas`, `pode`) + unit | GES-06 | `pnpm vitest run packages/contracts` |
| T2 | `User`/`Invite` com `permissoes`; `TenantUser.permissoes`; `authenticateSession` + `buildAuthDeps`; `can()` | GES-06 | `pnpm vitest run apps/api/src/middlewares` |
| T3 | Trocar guardas de todos os routers de domínio por `can()`; `canSeeFinance` dos controllers de documentos | GES-06 | `node .agents/skills/ethica-permissions/scripts/matrix.mjs api` + e2e dos módulos |
| T4 | Convite com matriz, `PATCH /auth/users/:id/permissoes`, diretório e sessão com permissões | GES-06 | e2e `identity` |
| T5 | Web: sessão, `can`, guarda central, navegação, botões; `PermissoesMatrix` no convite e em Usuários | GES-06 | web unit + build |
| T6 | Model `Atividade`, middleware do diário, `diarioService`, `GET /tenant/diario`, login; escritório lê exportações do diário; sai `dataExports` | GES-01 | unit + e2e |
| T7 | Web `/diario` (admin) | GES-01 | build + UAT |
| T8 | Fase e situação no contrato, model, service (regra única), listagem e filtros; laudo concluído; paradas sem suspensas | GES-02 | unit + e2e `pericia`, `laudo` |
| T9 | Web: fase no formulário, situação na listagem/detalhe, filtros | GES-02 | build + UAT |
| T10 | Contratante + `contracted_fees` no evento e no financeiro; contratante no financeiro e no relatório | GES-03 | unit `lancamento`, e2e |
| T11 | Web: contratante e rótulo do honorário na perícia; contratante no financeiro | GES-03 | build + UAT |
| T12 | `HOME_BLOCOS` nas preferências; `GET /pericias/paradas`; início com "Personalizar" e bloco de paradas | GES-04, GES-05 | e2e preferences + build + UAT |
| T13 | Seed de demonstração (permissões, fases, assistente com contratante, atividades), skill `ethica-permissions`, `apps/api/CLAUDE.md` | todos | `pnpm --filter api run seed:demo` |
| T14 | `pnpm run check`, build do web, UAT com os três logins no desktop e no celular, `validation.md` | todos | — |
