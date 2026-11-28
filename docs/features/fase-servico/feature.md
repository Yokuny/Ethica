---
feature: Fase e status do serviço
slug: fase-servico
descricao: Quatro tipos de serviço, esfera só na perícia, fase do serviço em grupos e status Ativo, Suspenso ou Cancelado
data: 2026-11-27
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-178, AD-180, AD-196, AD-306]
spec: [.specs/features/fase-servico]
branches: [main]
---

# Fase e status do serviço

**Status**: concluido · **Atualizado**: 2026-11-27 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='fase-servico'`.

## O que foi feito

- **Tipo de serviço**: Perícia, Assistência técnica, Parceria e Serviço particular (enum `serviceType`, AD-310). O "Cadastrar novo" saiu.
- **Esfera** (Trabalhista, Cível, Federal) só aparece, e é obrigatória, na perícia. Saiu a esfera Extrajudicial.
- **Assistência técnica**, Parceria e Serviço particular usam o formulário de dados do contratante.
- **Fase do serviço** (antes "Status do serviço"): a lista da perita em grupos (inicial, intermediária, de perdas, final, de recebimento, auxiliares) na perícia; a assistência tem a sua (`fase-assistencia`) e Parceria e Serviço particular a lista fixa da `servico-enums`. "Finalizado" (`finished`) é a última de todos e encerra.
- **Status**: Ativo, Suspenso, Cancelado. Cancelado, as fases de perdas (na assistência, "Acordo / desistência") e "Finalizado" encerram o serviço; "Honorários recebidos" não encerra (AD-306); Suspenso não conta como parado.
- Obrigatórios com asterisco: tipo, esfera (perícia), fase, status, objeto, número do processo, tribunal e data da nomeação (perícia).
- Lista com a coluna Fase (no tom do status), filtros por Fase e Status, detalhe com a fase e o status, ficha em PDF com Fase e Status, gráfico do início por grupo de fase.
- Data, hora e local da perícia seguem indo para a agenda como digitados (AD-160, AD-169), sem mudança.

## Por que

Pedido da perita (2026-11-03), com fotos da lista de fases do sistema que ela usava; escolhas dela em `.specs/features/fase-servico/spec.md`.

Não desfazer sem ler a AD-178 e a AD-310: fase e status são campos diferentes; "encerrado" depende dos dois (`isCaseClosed`); a esfera só existe na perícia, e o formulário de contratante vale para todo tipo menos a perícia (`usesContractor`).

## Como

### `packages`

- `packages/contracts/src/schemas/case.schema.ts` — `SERVICE_TYPES`, `CASE_PHASE_GROUPS`, `CASE_PHASES`, `casePhases`, `CASE_STATUS`, `CASE_CLOSED_PHASES`, `isCaseClosed`, `usesContractor`, `validServiceType`, `validNominationDate`.
- `packages/db/src/models/case.model.ts` — `serviceType`, `phase`, `courtType` opcional; `migrateCases` converte o formato anterior à AD-310.

### `apps/api`

- `apps/api/src/modules/case/case.service.ts` — cada tipo guarda só os seus campos (esfera na perícia, contratante fora dela).
- `apps/api/src/modules/case/case.repository.ts` — em aberto, parados, entregues e filtros `phase` e `serviceType`.
- `apps/api/src/modules/case/import.service.ts` — fase e status lidos da planilha; esfera só na perícia.
- `apps/api/src/modules/documents/` — rótulos das fases (`document.layout.ts`), ficha e paradas com a fase; concluir o laudo com a entrega leva a fase a "Laudo entregue".

### `apps/web`

- `apps/web/src/components/case-labels.ts` — `casePhaseLabel`, `CASE_PHASE_GROUP_ITEMS`, `caseStatusLabel`, `SERVICE_TYPE_ITEMS`.
- `apps/web/src/routes/_private/expert-cases/@components/{service-type-field,case-phase-field,case-form-fields}.tsx`.
- `apps/web/src/routes/_private/@components/cases-phase-chart.tsx`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case packages/db/src/models/case.model.int.test.ts
```

- Serviços → Novo: Perícia mostra Esfera; os outros tipos tiram a Esfera e mostram Dados do contratante, com a lista de fases do tipo. Salvar vazio marca os obrigatórios.

## Pendências

- [ ] A perita conferir os textos das fases (copiados da foto; "agendam" virou "agendamento").

## Histórico

- 2026-11-27 — Tipo e fase só em enums (AD-310, `servico-enums`): sai o "Cadastrar novo", a fase digitada e o `role`; "Finalizado" (`finished`) entra no fim da lista da perícia e encerra o serviço.
- 2026-11-27 — "Honorários recebidos" deixa de encerrar o serviço, na perícia, na assistência e nos tipos do escritório (AD-306, pedido da perita); encerram o status Cancelado e as fases de `CASE_CLOSED_PHASES` (`packages/contracts/src/schemas/case.schema.ts`).
- 2026-11-27 — Pedido da perita: fase inicial "Nomeado" (`nominated`, `packages/contracts/src/schemas/case.schema.ts`) antes de "Nomeação aceita", para o processo em análise antes do aceite ou da escusa. Rótulos na tela e no PDF; na importação de planilha, o texto "Nomeado" passa a cair nessa fase (antes ia para "Aguardando agendamento"). O padrão do cadastro segue "Aguardando agendamento"; os serviços já gravados não mudam.
- 2026-11-05 — Fases da perícia passam de 34 para 20, com nomes curtos: as redundantes se juntam e os serviços salvos vão para a fase equivalente ao subir o sistema (AD-196). As impugnações deixam de ter o número da rodada.
- 2026-11-04 — `apps/api/scripts/seed-demo.ts` passa a gravar a fase (e status ativo) nos serviços de demonstração; o script ainda usava as etapas antigas e falhava ao rodar.
- 2026-11-04 — Assistência técnica deixa a lista em grupos e ganha lista própria de fases: feature `fase-assistencia` (AD-186).
- 2026-11-04 — Fase inicial ganha Nomeação aceita, Elaboração de proposta de honorários, Solicitação de documentos, Perícia agendada e Perícia realizada; nova **fase intermediária** com Laudo em elaboração, Documentos pendentes e Laudo em revisão, que substituem "Aguardando laudo pericial" e "Revisar laudo pericial" da fase final (serviços nelas convertidos na subida, AD-180). Vale para perícia e assistência técnica.
- 2026-11-03 — Implementado FSV-01 a FSV-08 (AD-178). Conferido no navegador: tipos, esfera só na perícia, assistência com contratante, fases por grupo, tipo novo e obrigatórios. Corrigido junto: o detalhe mostrava a esfera duas vezes.
