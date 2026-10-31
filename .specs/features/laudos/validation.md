# Laudo automatizado — Validation

**Data**: 2026-10-31 · **Branch**: `feat/laudos` (a partir de `main` em `878c3a6`) · **Veredito**: **PASS** (LAU-04 fora do escopo, AD-124)

Verificação em modo standalone (sem sub-agente): releitura dos critérios da spec contra os testes e UAT no navegador.

## Gate

| Comando | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest unit/structural/integration/e2e, Mongo Atlas Local) | 88 arquivos, 447 testes, todos passando |
| `(cd apps/web && pnpm run build)` | ok |
| `node .agents/skills/ethica-item-typography/scripts/scan.mjs --summary` | 0 texto cru |
| `docker compose up --build -d --renew-anon-volumes api web` + `seed:demo` | ok |

## Critérios × evidência

| Critério | Evidência |
| --- | --- |
| LAU-01.1 modelo em branco ou clonando o padrão | `laudo.router.e2e.test.ts` "modelos: padrão para todos e só leitura…"; UAT gestor: "Duplicar modelo" do parecer técnico |
| LAU-01.2 seção com título, ordem, nível, apenas título, quebra, sim e não | mesmo e2e (criar, mover, remover, HTML saneado); UAT gestor: edição da seção "Objetivo" e "Subir" em "Encerramento" (10 → 9) |
| LAU-01.3 variáveis com exemplo | `apps/web/src/components/laudo-labels.ts`; UAT: "Inserir variável" inseriu `[FUNCAO_RECLAMANTE]`, destacado no editor |
| LAU-02.1 resumo do processo e árvore marcar/sim/não | UAT admin: `/laudos/add` com o processo, partes e 34 seções numeradas |
| LAU-02.2 rascunho com seções, variante e variáveis resolvidas | e2e "laudo: cria com variáveis resolvidas…" (ordem do modelo, número do processo, "Reclamante") |
| LAU-03.1 salvar uma seção sem perder as outras; renumerar ao remover | mesmo e2e (PATCH por seção; remover deixa 2 seções e "2. Encerramento" no PDF) |
| LAU-03.2 PDF e Word com capa, sumário, seções, cabeçalho/rodapé e páginas | `laudo.unit.test.ts` (HTML e `word/document.xml` com títulos, TOC, tabela, campo PAGE); UAT: PDF de 4 páginas e o `.docx` convertido no Pages com sumário paginado |
| LAU-03.3 variável sem valor impede concluir e aponta a seção | e2e (422 `laudo_unresolved_variables` em concluir e PDF; pendências por seção, também depois de reabrir); UAT gestor: "Concluir" desabilitado e `[FUNCAO_RECLAMANTE]` apontado |
| LAU-03.4 concluir bloqueia edição, avança a etapa e dá baixa no prazo | e2e (prazo `filed` com a data, movimentação `report_filed`, etapa `report_delivered`, 409 `report_completed` ao editar e excluir); UAT admin e operador |
| LAU-05.1 biblioteca NR-15 anexos 1–14, NR-16, quesitos, conclusão, honorários, encerramento | `laudo.unit.test.ts` "cobre NR-15 anexos 1 a 14…" e "toda seção com texto tem as duas variantes…" |
| LAU-06.1 parecer técnico para assistente técnico, com modelo próprio | e2e "parecer técnico para assistente técnico…" (422 com o modelo de laudo); UAT gestor na perícia cível |
| LAU-06.2 medições, quesitos complementares/suplementares, impugnação | `laudo.unit.test.ts` (títulos do parecer) |
| LAU-06.3 reclamante/reclamada × autor/réu | `laudo.unit.test.ts` "denomina pela justiça…"; UAT: "Autor"/"Réu" no parecer cível |
| Edge: perícia excluída exclui os laudos | e2e (`expect.poll` até zerar) |
| Edge: modelo alterado não muda laudo criado | seções copiadas no `POST /laudos` (`laudo.service.ts`) |
| Edge: concluído não editável nem por URL | e2e 409 direto na API |

## UAT (navegador visível, http://localhost:15173, API docker :18080)

- **Admin, desktop**: hub, lista, rascunho do seed, iniciar laudo na perícia trabalhista (5 seções, Anexo 1 em "Não"), editar com negrito, exportar PDF e Word, concluir com a entrega; a perícia ficou "Laudo entregue" com o prazo protocolado e a movimentação.
- **Gestor, desktop**: modelos, leitura de seção do padrão, duplicar, editar seção, inserir variável, reordenar, parecer técnico na perícia cível com pendência apontada.
- **Operador**: modelos sem "Novo modelo" nem ações de edição; `POST /laudos/modelos` 403; laudo concluído sem "Concluir"/"Salvar" e editor só leitura.
- **Celular (iPhone 13)**: hub, lista, iniciar (árvore), detalhe e modelos sem rolagem horizontal.
- Corrigido durante a UAT: o rascunho mostrava pendência que a exportação já resolvia (agora a abertura resolve de novo); breadcrumb "laudos"/"modelos" sem tradução; "Ltda.." na identificação; rótulo de seção em caixa-alta na árvore; status "Concluída" no feminino; parágrafos sem espaço no Word.
