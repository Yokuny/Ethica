# Gestão do escritório — Validation

**Data**: 2026-11-01 · **Branch**: `feat/gestao-escritorio` · **Spec**: `.specs/features/gestao-escritorio/spec.md` · **Decisões**: AD-133 a AD-137

## Gates

| Gate | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest) | PASS — 95 arquivos, 516 testes |
| `(cd apps/web && pnpm run build)` | PASS |
| `node .agents/skills/ethica-permissions/scripts/matrix.mjs api` | toda rota de domínio com `can(modulo, acao)`; admin com `isAdmin` |

## Requisitos

| Req | Evidência automatizada | UAT |
| --- | --- | --- |
| GES-01 diário | `apps/api/src/middlewares/diario.middleware.unit.test.ts` (mapa método/caminho → módulo/ação), `apps/api/src/modules/identity/diario.router.e2e.test.ts` (grava escrita, ignora leitura e ação recusada, só admin, isolado por tenant), `documentos.router.e2e.test.ts` (exportação no diário) | admin vê entradas, edição da perícia com número linkado e ajuste de permissões; gestor e operador voltam ao início em `/diario` |
| GES-02 fases | `pericia.schema.unit.test.ts`, `pericia.service.unit.test.ts` (`resolverEtapaEFase`), `pericia.router.e2e.test.ts` (fase leva a etapa, 422 incoerente, suspensa, filtro de situação, encerrada sem fase) | admin escolhe "Acordo entre as partes": detalhe mostra "Suspensa"; filtro de situação lista só ela; listagem mostra a fase abaixo da etapa |
| GES-03 contratante | `pericia.router.e2e.test.ts` (honorário contratado vira `contracted_fees` com o contratante; 422 em perito do juízo), `lancamento.service.unit.test.ts` | detalhe mostra "Contratante"; valores só para quem vê o financeiro; listagem com "Contratado" |
| GES-04 início | `preferences.router.e2e.test.ts` (blocos ocultos, chave inválida, restaurar), `index.unit.test.tsx` | "Personalizar" esconde "Perícias por justiça" e "Restaurar padrão" devolve; operador sem fluxo de caixa |
| GES-05 paradas | `pericia.router.e2e.test.ts` (`/pericias/paradas` sem suspensas) | bloco "Perícias paradas" com 2 perícias e link ao relatório, desktop e celular |
| GES-06 matriz | `permissao.schema.unit.test.ts`, `authorization.middleware.unit.test.ts` (`can`), `auth.router.e2e.test.ts` (ajuste vale na sessão seguinte; 422 admin; 403 não admin; 400 ação sem ver), `tenantInvite.router.e2e.test.ts` (matriz no convite), `pericia.router.e2e.test.ts` (403 antes de gravar), `route.unit.test.ts` (guarda central) | três logins, desktop 1440×900 e celular 390×844: menu, rotas e botões por papel; admin dá "Ver" no financeiro ao operador, que passa a abrir `/financeiro/lancamentos` sem o botão "Adicionar" |

## UAT

Playwright com janela visível (`.claude/skills/playwright-skill`), API em :18080 e web em :15173 no docker, seed `pnpm --filter api run seed:demo`, contas de `ACC.md`. 76 checagens PASS, nenhum erro de página. Ajustes feitos depois das capturas: "Diário de bordo" na barra lateral do admin e alinhamento das colunas da matriz; coluna de honorários da listagem escondida sem `financeiro.view`. O seed foi refeito ao fim.

## Pendências observadas

- Entrada do diário para o ajuste de permissões e exclusões fica sem rótulo legível (a resposta não traz nome), só o id.
- A exportação ZIP (AD-122) não inclui o diário de bordo.
- Ordem dos blocos do início não é configurável (AD-136).
