# Padronização de nomes em inglês — Validation

**Data**: 2026-11-01 · **Branch**: `refactor/english-naming` · **Spec**: `.specs/features/english-naming/spec.md` · **Decisões**: AD-139 a AD-142

## Gates

| Gate | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest) | PASS — 95 arquivos, 516 testes, ao fim de cada uma das oito fatias e na rodada final |
| `(cd apps/web && pnpm run build)` | PASS |
| `pnpm docs:check` | PASS |
| `node .agents/skills/ethica-permissions/scripts/matrix.mjs api` | toda rota de domínio com `can(module, action)` em inglês |

## Requisitos

| Req | Evidência |
| --- | --- |
| ENG-01 models e collections | `packages/db/src/models/*.model.ts`; `tests/structural/module-boundary.structural.test.ts` (`DB_OWNERSHIP`) |
| ENG-02 campos e payloads | contrato e models; e2e de cada módulo enviando e lendo os campos novos |
| ENG-03 parâmetros de URL | `?state=`, `?kind=`, `?months=`, `?caseId=` nos e2e e no UAT (filtros e links entre telas) |
| ENG-04 pastas e arquivos | `apps/api/src/modules/{case,agenda,finance,documents,prospecting,identity}/`; teste estrutural de fronteira verde |
| ENG-05 identificadores | `tsc` verde; varredura de identificadores sem termo em português fora das exceções (Datajud, colunas do CSV) |
| ENG-06 índices, S3, IndexedDB | `search_indexes.provisioned` com `case_text`/`party_text`; chave `tenants/<id>/inspections/…`; prefixos `day:`, `record:`, `draft:`, `media:` |
| ENG-07 texto em pt-BR | UAT sem chave crua na tela; PDFs e e-mail com os mesmos textos (strings desses arquivos não foram tocadas) |
| ENG-08 seed e UAT | seed refeito e índices reprovisionados no docker; UAT abaixo |
| ENG-09 documentação | `feature.md` das features, `apps/api/CLAUDE.md`, glossário e skills citam os nomes novos |

## UAT

Playwright com janela visível (skill `playwright-skill`), API em :18080 e web em :15173 no docker, contas de `ACC.md` (admin, gestor, operador), desktop 1440×900 e celular 390×844: 31 telas por conta e tamanho, 186 capturas. Nenhum erro de console, de página ou de API; nenhuma chave de tradução crua. Gestor volta ao início em usuários, escritório e diário; operador também no financeiro (matriz, AD-137). Achados corrigidos durante o UAT: descrição de "Perícias" no início com chave desencontrada; breadcrumb do detalhe mostrando `expert-cases`.

## Pendências observadas

- Collections antigas em português no banco local ficam até recriar o banco (AD-141).
- Dois e2e dependentes de indexação do Atlas e um de concorrência (`invite`, `auth`) falharam uma vez cada sob carga e passaram isolados e na rodada seguinte.
