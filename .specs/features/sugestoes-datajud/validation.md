# Sugestões do Datajud no serviço e no financeiro — Validation

**Data**: 2026-11-28 · **Spec**: `.specs/features/sugestoes-datajud/spec.md` · **Design**: `design.md` · **Tasks**: `tasks.md`

## Testes automáticos

`pnpm run check` verde a cada task (776 testes na última rodada antes da conferência), `apps/web` com `pnpm run build`.

| Requisito | Cobertura |
| --- | --- |
| SGD-04 (regras pela TPU, fim do processo) | `packages/contracts/src/schemas/automation-rules.unit.test.ts` |
| SGD-05 (cobrar e encerrar pelo estado) | `apps/worker/src/jobs/court-refresh.int.test.ts` (cobra uma vez, encerra recebido, avisa em aberto, sem receita nada, recebimento pendente segura e a rejeição libera o aviso) |
| SGD-06 (busca na hora) | `apps/api/src/modules/automation/automation.router.e2e.test.ts` (cópia do dia, 404, 503, 400, sem o módulo, sem chave) |
| SGD-07 (preencher) | worker (criada em qualquer consulta, uma vez) e `notification.router.e2e.test.ts` (aceitar grava só o vazio) |
| SGD-01 (botão) | `apps/web/src/components/suggestion-button.unit.test.tsx` (some sem sugestão, conta, esconde a que já não cabe) |
| SGD-02 (lançamento) | `transaction.router.e2e.test.ts` (`GET /finance/entries/:id`, 404 de outro escritório) |
| SGD-08 (lista) | `apps/web/src/routes/_private/expert-cases/details/@utils/court-movement-rows.unit.test.ts` |

## Conferência na tela (banco local, escritório Perícias Demo)

Serviço de teste com a cópia do processo e quatro sugestões gravadas à mão no banco local; API na porta 18081 (a 18080 estava ocupada por outro projeto da máquina).

- Detalhe do serviço: "4 Sugestões" no cabeçalho, "Sugestão" ao lado da situação, da fase e da vara vazia; o popover mostra o que muda, o movimento e a data, com Rejeitar e Aprovar. Aprovar a suspensão mudou a situação para Suspenso, o contador foi para 3 e o botão da situação sumiu.
- No tribunal: sem Decurso de Prazo, Publicação e Disponibilização numa linha, "Expedição de documento ×3 · Alvará", selo "Gera aviso ou sugestão" nos movimentos de regra.
- Notificações: ícones "Abrir lançamento" (recebimento, cobrança) e "Abrir serviço" (situação, fase, preenchimento) com o link certo; o de recebimento abriu o detalhe do lançamento com valor, vencimento, recebido, saldo, "Sugestão" ao lado do saldo e "1 Sugestão" no cabeçalho.
- Cadastro: com o número 0002345-67.2026.5.02.0011, o ícone de busca preencheu tribunal TRT2, vara "11ª Vara do Trabalho de São Paulo" (vinda em maiúsculas) e objeto, com o aviso de conferir antes de salvar.

Achados corrigidos na conferência: o "Abrir" da notificação deixava a página em branco (link dentro de botão do Base UI sem `nativeButton={false}`); o botão de busca com texto espremia o campo do número (virou ícone com dica).

## Não conferido

- Busca na hora contra o Datajud real (só a cópia do dia e o Datajud falso dos testes); o tempo de até 110 s depende do proxy da Railway.
- Rodada real do worker com as regras novas: em produção a primeira rodada depois da limpeza só grava a linha de base.
- Celular.
