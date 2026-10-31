# Prazos e recebimentos — Validation

**Data**: 2026-10-31 · **Diff**: `f66d312..836ef59` (branch `feat/prazos-recebimentos`) · **Veredito**: **PASS** (com UAT visual pendente)

Verificação em modo standalone (sem sub-agente): releitura independente dos critérios da spec contra os testes e injeção de falhas de comportamento.

## Gate

| Comando | Resultado |
| --- | --- |
| `pnpm run check` (tsc + biome + vitest unit/structural/integration/e2e, Mongo Atlas Local) | 76 arquivos, 386 testes, todos passando |
| `(cd apps/web && pnpm run build)` | ok, sem avisos |
| `node .agents/skills/ethica-item-typography/scripts/scan.mjs --summary` | 0 texto cru |

## Critérios × evidência

| Critério | Evidência |
| --- | --- |
| PRZ-01.1 prazo criado pendente | `apps/api/src/modules/pericia/prazo.router.e2e.test.ts` "cria pendente, protocola…" |
| PRZ-01.2 protocolo com data | idem (data informada e, sem data, hoje) |
| PRZ-01.3 perdido fora dos pendentes | idem (`GET /pericias/prazos` vazio depois de perdido) |
| PRZ-01.4 prazo do laudo vira "Entrega do laudo" | `prazo.router.e2e.test.ts` "cadastrar a perícia com prazo do laudo…"; `pericia.service.unit.test.ts` |
| PRZ-01.5 próximo prazo e "vence em breve" (15 dias) | `prazo.router.e2e.test.ts` "listagem mostra o próximo prazo…"; `apps/web/src/components/prazo-labels.unit.test.ts`; `pericia-prazos.unit.test.tsx` |
| PRZ-01.6 prazos no calendário | `prazo.router.e2e.test.ts` "calendário recebe só os pendentes…"; `apps/web/src/routes/_private/agenda/@components/month-view.unit.test.tsx` |
| Excluir perícia exclui prazos | `prazo.router.e2e.test.ts` "excluir a perícia exclui os prazos…" |
| PRZ-02.1–3 parcela, parcial/liquidado, estorno | `apps/api/src/modules/financeiro/lancamento.router.e2e.test.ts` "R$ 4.800…" (o teste independente da spec) |
| PRZ-02.4 parcela acima do saldo | idem "parcela maior que o saldo…" |
| PRZ-02.5 fluxo pela data da parcela | idem "resumo e fluxo…" (inclui parcela de outro mês) |
| AD-111 sem excluir/cancelar, valor ≥ recebido, honorário fixado atualiza | `lancamento.router.e2e.test.ts`; `lancamento.service.unit.test.ts` |
| PRZ-03.1/2/4 link secreto, `text/calendar`, revogar | `apps/api/src/modules/agenda/feed.router.e2e.test.ts` |
| PRZ-03.3 data, descrição, local | `apps/api/src/modules/agenda/feed.service.unit.test.ts` |
| PRZ-04.1 aviso 15 dias / hoje / ontem, um e-mail por pessoa | `apps/api/src/modules/agenda/avisoPrazo.service.unit.test.ts` |
| PRZ-04.2 protocolado para de avisar | a consulta só traz `status: 'pendente'` (`prazo.repository.ts`, `listPendentesNosDias`); coberto indiretamente pelo e2e de status |
| PRZ-04.3 → AD-110 preferência por usuário | `feed.router.e2e.test.ts` "aviso começa ligado…" |
| Tenant suspenso sem feed nem e-mail | `feed.router.e2e.test.ts` (feed 404, fora dos destinatários) |

⚠️ Spec-precision: PRZ-04.3 dizia "o tenant desliga"; a AD-110 trocou por preferência por usuário (decisão do usuário).

## Sensor de discriminação

12 mutantes de comportamento, aplicados um a um e revertidos (`git checkout`):

| Mutante | Resultado |
| --- | --- |
| M1 limite de 15 dias exclusivo | morto |
| M2 parcela igual ao saldo recusada | morto |
| M3 protocolo sem data não grava hoje | morto |
| M4 aviso de "ontem" vira anteontem | morto |
| M5 feed inclui cancelados | morto |
| M6 honorário excluível | morto |
| M7 recebido do mês sem filtro de data | **sobreviveu** → teste reforçado (`836ef59`), morto na nova rodada |
| M8 excluir perícia mantém prazos | morto |
| M9 feed de tenant suspenso | morto |
| M10 aviso desligado recebe | morto |
| M11 prazo sem fim exclusivo no dia seguinte | morto |
| M12 faixa conta até 14 dias | morto |

Lição registrada: L-001 (`.specs/LESSONS.md`).

## Não verificado

- UAT visual das telas com o app rodando (detalhe da perícia, agenda, financeiro, conta) e assinatura real do feed num Google Agenda.
- Envio real por SMTP (testado com `MailProvider` simulado).
