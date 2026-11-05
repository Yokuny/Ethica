---
feature: Fase e status do serviço
slug: fase-servico
descricao: Tipo Perícia, Assistência técnica ou Cadastrar novo, esfera só na perícia, fase do serviço em grupos e status Ativo, Suspenso ou Cancelado
data: 2026-11-04
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-178, AD-180]
spec: [.specs/features/fase-servico]
branches: [main]
---

# Fase e status do serviço

**Status**: concluido · **Atualizado**: 2026-11-04 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='fase-servico'`.

## O que foi feito

- **Tipo de serviço**: Perícia, Assistência técnica, os tipos já criados pelo escritório e Cadastrar novo. Parceria saiu da lista fixa; os serviços de parceria viraram o tipo do escritório "Parceria", que continua na lista.
- **Esfera** (Trabalhista, Cível, Federal) só aparece, e é obrigatória, na perícia. Saiu a esfera Extrajudicial.
- **Assistência técnica** usa o formulário de dados do contratante, como o tipo novo.
- **Fase do serviço** (antes "Status do serviço"): a lista da perita em grupos (inicial, intermediária, de perdas, final, de recebimento, auxiliares) na perícia e na assistência; no tipo novo, as fases digitadas nele, "Honorários recebidos" ou cadastrar nova.
- **Status**: Ativo, Suspenso, Cancelado. Cancelado, as fases de perdas e "Honorários recebidos" encerram o serviço; Suspenso não conta como parado.
- Obrigatórios com asterisco: tipo, esfera (perícia), fase, status, objeto, número do processo, tribunal e data da nomeação (perícia).
- Lista com a coluna Fase (no tom do status), filtros por Fase e Status, detalhe com a fase e o status, ficha em PDF com Fase e Status, gráfico do início por grupo de fase.
- Data, hora e local da perícia seguem indo para a agenda como digitados (AD-160, AD-169), sem mudança.

## Por que

Pedido da perita (2026-11-03), com fotos da lista de fases do sistema que ela usava; escolhas dela em `.specs/features/fase-servico/spec.md`.

Não desfazer sem ler a AD-178: fase e status são campos diferentes; "encerrado" depende dos dois (`isCaseClosed`); a esfera só existe na perícia, e o formulário de contratante vale para tipo do escritório e assistência (`usesContractor`).

## Como

### `packages`

- `packages/contracts/src/schemas/case.schema.ts` — `CASE_PHASE_GROUPS`, `CASE_PHASES`, `CASE_STATUS`, `CASE_CLOSED_PHASES`, `isCaseClosed`, `usesContractor`, `validServiceType`, `validNominationDate`.
- `packages/db/src/models/case.model.ts` — `phase`, `phaseName`, `courtType` opcional; `migrateCases` converte os serviços existentes.

### `apps/api`

- `apps/api/src/modules/case/case.service.ts` — cada tipo guarda só os seus campos (esfera na perícia, contratante fora dela, fase digitada no tipo do escritório).
- `apps/api/src/modules/case/case.repository.ts` — em aberto, parados, entregues e filtro `phase`; tipos do escritório com `phases`.
- `apps/api/src/modules/case/import.service.ts` — fase e status lidos da planilha; esfera só na perícia.
- `apps/api/src/modules/documents/` — rótulos das fases (`document.layout.ts`), ficha e paradas com a fase; concluir o laudo com a entrega leva a fase a "Laudo entregue".

### `apps/web`

- `apps/web/src/components/case-labels.ts` — `casePhaseLabel`, `CASE_PHASE_GROUP_ITEMS`, `caseStatusLabel`, tipos sem Parceria.
- `apps/web/src/routes/_private/expert-cases/@components/{service-type-field,case-phase-field,case-form-fields}.tsx`.
- `apps/web/src/routes/_private/@components/cases-phase-chart.tsx`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case packages/db/src/models/case.model.int.test.ts
```

- Serviços → Novo: Perícia mostra Esfera; Assistência técnica tira a Esfera e mostra Dados do contratante; Cadastrar novo abre a fase digitada. Salvar vazio marca os obrigatórios.

## Pendências

- [ ] A perita conferir os textos das fases (copiados da foto; "agendam" virou "agendamento").

## Histórico

- 2026-11-04 — Assistência técnica deixa a lista em grupos e ganha lista própria de fases: feature `fase-assistencia` (AD-186).
- 2026-11-04 — Fase inicial ganha Nomeação aceita, Elaboração de proposta de honorários, Solicitação de documentos, Perícia agendada e Perícia realizada; nova **fase intermediária** com Laudo em elaboração, Documentos pendentes e Laudo em revisão, que substituem "Aguardando laudo pericial" e "Revisar laudo pericial" da fase final (serviços nelas convertidos na subida, AD-180). Vale para perícia e assistência técnica.
- 2026-11-03 — Implementado FSV-01 a FSV-08 (AD-178). Conferido no navegador: tipos, esfera só na perícia, assistência com contratante, fases por grupo, tipo novo e obrigatórios. Corrigido junto: o detalhe mostrava a esfera duas vezes.
