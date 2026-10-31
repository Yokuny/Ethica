# Importação de processos — Validation

**Data**: 2026-10-31 · **Branch**: `feat/importacao-processos` (a partir de `main` em `5bdd930`) · **Veredito**: **PASS**

Verificação em modo standalone (sem sub-agente): releitura dos critérios da spec contra os testes e UAT no navegador.

## Gate

| Comando | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest unit/structural/integration/e2e, Mongo Atlas Local) | 82 arquivos, 416 testes, todos passando |
| `(cd apps/web && pnpm run build)` | ok, sem avisos |
| `node .agents/skills/ethica-item-typography/scripts/scan.mjs --summary` | 0 texto cru |

## Critérios × evidência

| Critério | Evidência |
| --- | --- |
| IMP-01.1 extrai número, vara, comarca, objeto, partes, advogados, nomeação e prazo | `apps/api/src/modules/pericia/importacao.service.unit.test.ts` (`extrairAta`); `importacao.router.e2e.test.ts` "PDF devolve o rascunho sem gravar…" |
| IMP-01.2 campo não achado fica vazio e sinalizado | `importacao.service.unit.test.ts` "campo não achado…" (`missing`); UAT: painel "Não encontrado no PDF" |
| IMP-01.3 número inválido avisa; duplicado avisa e não cria | `importacao.service.unit.test.ts` (`invalid_process_number`); `importacao.router.e2e.test.ts` (`existingId`); `POST /pericias` continua 409 |
| IMP-01.4 salvar cria perícia e partes novas | `importacao.router.e2e.test.ts` (salva o rascunho, 2 partes); `parte.router.e2e.test.ts` "cadastrar a perícia cria as partes novas…" |
| IMP-01.5 não-PDF e acima do limite recusados | `importacao.router.e2e.test.ts` "recusa arquivo que não é PDF (415)…, 413, 422" |
| IMP-02.1 modelo com colunas e exemplo | `apps/web/src/routes/_private/pericias/import/@utils/csv-template.unit.test.ts`; UAT: download `modelo-importacao-pericias.csv` |
| IMP-02.2 teste independente (3 criadas, 1 ignorada, 1 recusada) | `importacao.router.e2e.test.ts` "CSV com 3 válidas…" |
| IMP-02.3 partes reaproveitadas ou criadas | idem (a mesma ré em duas linhas vira 1 cadastro) |
| IMP-03.1 cadastro de parte e advogado | `parte.router.e2e.test.ts` (POST/PATCH `/partes`, e-mail vazio vira ausente) |
| IMP-03.2 escolher ou criar na edição da perícia | `parte.router.e2e.test.ts` "parteId usa o cadastro escolhido…"; UAT: sugestão do cadastro no campo nome |
| IMP-03.3 perícias da parte | `parte.router.e2e.test.ts` (`GET /partes/:id/pericias`) |
| AD-117 renomear propaga; isolamento por tenant; busca por nome da parte | `parte.router.e2e.test.ts` "renomear a parte…", "lista por tipo e busca…" |
| IMP-04.1 dados trabalhistas | `parte.router.e2e.test.ts` "grava os dados trabalhistas…" |
| IMP-04.2 período sugerido | `packages/contracts/src/schemas/pericia.schema.unit.test.ts`; `pericia.service.unit.test.ts`; UAT: "Usar período sugerido" |
| Edge: vários números no PDF | `importacao.service.unit.test.ts` (`multiple_process_numbers`) |
| Edge: CSV vazio/sem cabeçalho; data impossível recusa a linha | `importacao.router.e2e.test.ts` "CSV vazio ou sem coluna obrigatória…"; `importacao.service.unit.test.ts` (31/02) |

## UAT no navegador (2026-10-31)

API no docker (:18080, recriada com `--renew-anon-volumes` por causa da dependência nova `unpdf`), web em :15173, login `operator@pericias.example.com` (`ACC.md`), Chromium headless (Playwright).

1. `/pericias/add` → "Preencher com PDF" com uma ata gerada (TRT15): número, TRT15, "3ª Vara do Trabalho", Campinas, "Perícia de periculosidade", nomeação e prazo calculado (+30 dias, com aviso) e 3 partes preenchidos; salvar reaproveitou o advogado pela OAB e a ré pelo CNPJ do seed.
2. Mesmo PDF de novo → link "Abrir a perícia já cadastrada".
3. `/pericias/import` → modelo baixado; CSV de 5 linhas ⇒ 3 criadas, 1 ignorada (linha 5, já cadastrada), 1 recusada (linha 6, `data_nomeacao: Data inválida.`).
4. `/partes` → lista e abas por tipo; detalhe da ré com 5 perícias; renomear propagou para o detalhe da perícia.
5. Edição de perícia trabalhista → sugestão "3 jul 2021 – 3 jun 2026" aplicada; nova parte escolhida pela sugestão do cadastro e salva.
6. Celular (390 px) → `/partes` e `/pericias/import` sem quebra (a tabela rola de lado, padrão do DataTable).
7. Nenhum erro de console. Ajustes feitos depois da UAT: linha de parte em 2 colunas (o nome ficava estreito) e placeholder de OAB "Ex.: SP123456" (parecia valor gravado).

O banco local foi recriado com `pnpm --filter api run seed:demo` ao final.
