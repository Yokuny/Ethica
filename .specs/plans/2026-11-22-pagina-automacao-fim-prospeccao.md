# Plano — Página "Automação Datajud" no lugar da Prospecção

- **Data**: 2026-11-22
- **Status**: aprovado pelo usuário em 2026-11-22 ("Sim, siga"); não iniciado
- **Feature**: `automacao-datajud` (o registro vivo é `docs/features/automacao-datajud/feature.md`)
- **Contexto**: plano arquivado `.specs/features/central-notificacoes/plans/2026-11-22-automacao-datajud-notificacoes.md` e ADs AD-263 a AD-280 em `.specs/STATE.md`.

## Decisões do usuário (não reabrir)

1. O **Datajud** é inteligência e automação sobre os processos que o escritório já tem: acompanhar, avisar e sugerir. O **DJEN** será a descoberta de processos novos (nomeações) e vai ser construído **do zero, depois**, com a caixa de nomeações própria.
2. A **Prospecção sai inteira**: busca no Datajud, oportunidades, model, rotas e o módulo `prospecting` da matriz de permissões. É um MVP sem usuários reais: a troca é feita num commit só, **sem shim**, como foi feito com o `Deadline` (AD-263).
3. O item de menu da Prospecção vira a página **"Automação Datajud"**.

## Página nova (`apps/web/src/routes/_private/automation/`)

- Sem o módulo (`hasAutomationSession` falso): a oferta (`apps/web/src/components/automation-offer.tsx`).
- Com o módulo:
  - **Processos acompanhados**: os serviços com `CaseCourtSync` (rótulo do serviço com link, tribunal, data da última consulta). Rota nova no módulo `automation` da API, `GET /automation/cases`, que lê `CaseCourtSync` do escritório e enriquece pelo `caseService.findSummariesByIds`, com `requireAutomation` e `expert_cases` `view`.
  - **Para aprovar**: o número de sugestões pendentes, com link para `/notifications?view=suggestions`.
  - **Regras**: a lista do que cada movimento do tribunal sugere, a partir de `AUTOMATION_RULES`, `PAYMENT_INTENT_CODES` e `isPaymentAvailable` (`packages/contracts/src/schemas/automation-rules.ts`), em texto da perita, com chaves de tradução, sem número de código na tela.
- O menu, o início (`home-sections`, `home-access`, `home.interface`), o `mobile-dock` e o tour apontam para `/automation`. Permissão para ver: `expert_cases` `view`.

## Remoção (inventário de 2026-11-22, `rg -il "prospect|opportunit|datajudClient|DatajudSearch|DatajudCourt|datajud_not_configured|opportunityId"`)

- **Web**: `apps/web/src/routes/_private/prospecting/**` (todas as páginas, a query e os componentes), referências em `query/case.ts`, `query/listStats.ts`, `expert-cases/details/@hooks/use-case-edit-form.ts`, `activity-log-labels.ts`, `permissions-labels.ts`, `translate.helper.ts` (só as chaves que ficarem sem uso).
- **API**: `apps/api/src/modules/prospecting/` inteiro; `apps/api/src/providers/datajudClient.ts` e o teste dele (o cliente do worker, `apps/worker/src/datajud/client.ts`, fica); em `app.ts`, a montagem e a dependência `datajud`; em `config/env.config.ts`, `DATAJUD_API_KEY` e `DATAJUD_BASE_URL` (a API não usa mais; **não** apagar a variável na Railway, porque o worker a referencia da API); o limitador da busca em `rateLimit.middleware.ts`; em `activityLog.middleware.ts`, o `'/prospecting/datajud/search'` do `IGNORED` e o `prospecting` do mapa; `schema.registry.ts`; `opportunityId` em `case.schema.ts`, `case.repository.ts`, `case.service.ts`; a exportação de oportunidades em `documents/documents.service.ts`; os seeds (`seed-demo`, `seed-volume`).
- **Contrato**: `packages/contracts/src/schemas/prospecting.schema.ts` e as entradas dele em `index.ts`, `registry.ts`, `registry.unit.test.ts`; `opportunityId` em `case.schema.ts`; `'prospecting'` em `PERMISSION_MODULES` (`permission.schema.ts`) e em `activityLog.schema.ts`; `datajud_not_configured` e outras chaves só da prospecção em `response/messages.ts`.
- **Banco**: `packages/db/src/models/opportunity.model.ts`, as exportações e o `createIndexes` em `index.ts`, o campo `opportunityId` em `case.model.ts`; o índice de busca do Atlas, se houver um de oportunidades em `textSearch.ts`.
- **Testes estruturais**: `prospecting` sai do `DB_OWNERSHIP` (`tests/structural/module-boundary.structural.test.ts`).
- **Docs**: `apps/api/CLAUDE.md` (árvore, grafo e tabela de donos), `docs/glossary.md` (Oportunidade sai), `docs/architecture.md`, `PRODUCT.md` se citar prospecção, o `feature.md` da prospecção (marcar como substituída), roadmap. AD nova: substitui a AD-105 (busca no Datajud pela API) e registra a divisão Datajud × DJEN. O plano `.specs/plans/2026-11-22-prospeccao-worker-datajud.md` é arquivado em `.specs/features/prospeccao-datajud/plans/` com uma nota: a base técnica do worker foi executada, a busca foi abandonada e o DJEN fica no roadmap.
- **Aceite**: `rg -il "prospect|opportunit|datajudClient|DatajudSearch|opportunityId" apps packages tests` vazio fora de histórico de docs e dos fixtures do worker.

## Dados de produção (depois do deploy, com confirmação do usuário)

- Acesso: `.env.prod.local` na raiz (ignorado pelo Git) tem `PROD_MONGODB_URI` (usuário `ethica-worker`, só leitura parcial) e `PROD_ADMIN_MONGODB_URI` (administrador). Rodar `mongosh` pelo container local: `docker exec -e URI="$URI" ethica-mongo sh -c 'mongosh --quiet "$URI" ...'`, sem nunca imprimir a URI. O nome do banco não vem na URI: usar `db.getSiblingDB('ethica')`.
- Antes de apagar: mostrar a contagem de `opportunities` e de serviços com `opportunityId`, salvar cópia em `/Users/yokuny/Documents/ethica-backups/` e pedir confirmação. Depois: apagar a collection `opportunities` e fazer `$unset` de `opportunityId` nos `cases`.
- Hoje a produção só tem o escritório ETHICA (Tamires e felipe.vni789@gmail.com), com o plano Mensal + Automação gravado no banco até 31/12/2027, sem Asaas.

## Protocolo

Seguir o `AGENTS.md`: direto na `main`, `git add` por arquivo, commit sem `Co-Authored-By` nem menção a LLM, `pnpm run check` e `(cd apps/web && pnpm run build)` verdes, registro (feature.md, STATE.md, roadmap, `pnpm docs:sync`), push. O CI do GitHub Actions roda a cada push na `main`. Outra sessão pode estar trabalhando na mesma pasta: conferir o próximo número livre de AD antes de escrever e só adicionar arquivos próprios no commit.
