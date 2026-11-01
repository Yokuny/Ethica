# Padronização de nomes em inglês — Specification

**Origem**: pedido do usuário em 2026-11-01, continuação da AD-113 (valores de domínio em inglês) e da AD-138 (rotas, pastas de rota e valores da matriz/diário em inglês). Prefixo de requisito: `ENG`.

## Problem Statement

Desde a AD-113 o back-end grava e devolve **valores** em inglês (`appointed`, `fixed_fees`, `pending`…), e desde a AD-138 as **URLs** também são inglesas (`/expert-cases`, `/finance/entries`). Os **nomes** continuam em português: campos (`numeroProcesso`, `honorariosFixadosCents`, `partes`), parâmetros de busca da URL (`?situacao=`, `?meses=`), models e collections (`Pericia`, `Lancamento`), pastas de módulo da API (`modules/pericia`), schemas do contrato (`createPericiaSchema`, `PERICIA_STATUS`), identificadores (`periciaService.listParadas`, `vistoriaKeys`) e eventos (`pericia:honorarios_fixados`). O resultado é um código bilíngue: a rota é `/expert-cases`, a pasta da rota chama `pericia-form-fields.tsx`, o model é `Pericia` e o valor gravado é `appointed`. Quem lê precisa traduzir de cabeça a cada camada.

## Goals

- [ ] Todo nome que o código define (campo, parâmetro, model, collection, pasta, arquivo, schema, tipo, função, variável, chave de query, evento) é inglês, com **um termo por conceito** em todas as camadas.
- [ ] O que o usuário lê continua em pt-BR: tela pelo dicionário `t()` (`apps/web/src/lib/helpers/translate.helper.ts`), e-mail, feed iCal, PDFs e Word montados no servidor (exceção da AD-113).
- [ ] Nenhuma estrutura de compatibilidade fica para trás (sem alias, shim, campo duplicado ou redirecionamento).

## Out of Scope

| Item | Reason |
| --- | --- |
| Texto de tela, e-mail, iCal, PDF, Word | pt-BR por definição (AD-113). |
| Documentação (`docs/`, `.specs/`, `AGENTS.md`, skills) | O idioma do projeto para documentação é português; só os **caminhos e nomes** citados são atualizados. |
| Valores de domínio | Já em inglês (AD-113). |
| Rotas do web e da API | Já em inglês (AD-138). |

---

## Inventário do que ainda está em português

Contagem feita em 2026-11-01 sobre a branch `feat/gestao-escritorio` (commit `10cd4f8`, com a AD-138). Os números são de nomes **distintos** ou de arquivos, não de ocorrências.

| Categoria | Quantidade | Exemplos |
| --- | --- | --- |
| Models e collections (`packages/db/src/models/`) | 10 models (10 collections) | `Pericia`, `Prazo`, `Parte`, `Lancamento`, `Compromisso`, `Vistoria`, `Laudo`, `ModeloLaudo`, `Oportunidade`, `Atividade` |
| Campos de model e de contrato (inclui subdocumentos e `Tenant`/`User`/`Invite`) | ~110 nomes distintos | `numeroProcesso`, `justica`, `papel`, `partes`, `polo`, `contratante`, `honorariosFixadosCents`, `dataNomeacao`, `vencimento`, `protocoladoEm`, `parcelas`, `liquidadoEm`, `secoes`, `apenasTitulo`, `presentes`, `paradigmas`, `midias`, `versao`, `cabecalho`, `rodape`, `permissoes`, `blocosOcultos`, `registroProfissional` |
| Referências entre collections (campo-ref maiúsculo) | 6 | `Pericia`, `Parte`, `Compromisso`, `Oportunidade`, `CriadoPor`, `ConcluidoPor` |
| Índices de busca do Atlas | 2 | `pericia_text`, `parte_text` (`packages/db/src/textSearch.ts`) |
| Chave de arquivo no S3 | 1 prefixo | `tenants/<id>/vistorias/<compromissoId>/<midiaId>` (`apps/api/src/modules/agenda/vistoria.service.ts`) |
| Parâmetros de busca da URL do web | 10 nomes, em 9 telas | `situacao`, `fase`, `justica`, `tipo`, `natureza`, `periciaId`, `modeloId`, `modulo`, `acao`, `meses` |
| Parâmetros de query da API | os mesmos nomes dos schemas de listagem | `?situacao=`, `?natureza=`, `?periciaId=` |
| Pastas de módulo da API (`apps/api/src/modules/`) | 4 | `pericia`, `documentos`, `financeiro`, `prospeccao` (`agenda` e `identity` já servem) |
| Arquivos com nome em português | 81 na API, 137 no web, 14 no contrato, 10 no db | `pericia.service.ts`, `laudo.variaveis.ts`, `pericia-form-fields.tsx`, `use-status-rapido.ts`, `prazo.schema.ts`, `modeloLaudo.model.ts` |
| Identificadores exportados com termo em português | ~148 de 203 no contrato, ~244 de 484 na API, ~307 no web, ~35 no db | `createPericiaSchema`, `PERICIA_STATUS`, `LANCAMENTO_CATEGORIAS`, `periciaService.listParadas`, `lancarHonorariosFixados`, `usePericiaForm` |
| Chaves de query do TanStack Query | 9 de 15 | `periciaKeys`, `prazoKeys`, `parteKeys`, `lancamentoKeys`, `laudoKeys`, `compromissoKeys`, `vistoriaKeys`, `oportunidadeKeys`, `avisoAgendamentoKeys` |
| Eventos de domínio e campos de payload | 2 eventos, 4 campos | `pericia:honorarios_fixados`, `pericia:deleted`; `periciaId`, `numeroProcesso`, `valorCents`, `categoria` |
| Chaves do armazenamento offline (IndexedDB) | 5 prefixos | `dia:`, `registro:`, `rascunho:`, `midia:`, `status:` (`apps/web/src/lib/offline/store.ts`) |
| Comentários em português | ~1.800 linhas | em todo o código (~46 mil linhas `.ts`/`.tsx`) |

### Fica em português de propósito (sugestão, confirmar na pergunta 1)

| Item | Por quê |
| --- | --- |
| Marcadores do laudo (`[NUMERO_PROCESSO]`, `[NOME_PERITO]`… em `LAUDO_VARIAVEIS` e `DOCUMENT_MARKERS`) | O perito digita esses marcadores no texto do modelo; são texto do usuário, não nome de código. |
| Cabeçalhos do CSV de importação (`CSV_IMPORT_COLUMNS`) e nomes/cabeçalhos dos CSVs da exportação | O usuário preenche e abre a planilha. |
| Nome do assunto no client do Datajud | A API do CNJ indexa em português (AD-113). |
| Comentários | Mesmo idioma da documentação do projeto. |

---

## Requirements

| ID | Requisito |
| --- | --- |
| ENG-01 | Models e collections com nome em inglês, conforme o glossário; collections novas sem cópia das antigas. |
| ENG-02 | Campos de model, de contrato, de payload HTTP e de evento em inglês, conforme o glossário e a convenção de datas. |
| ENG-03 | Parâmetros de busca da URL do web e de query da API em inglês. |
| ENG-04 | Pastas e arquivos de módulo da API, do contrato, do db e do web em inglês, mantendo as regras de módulo (AD-038) e o teste `tests/structural/module-boundary.structural.test.ts`. |
| ENG-05 | Identificadores de código (schemas, tipos, constantes, funções, hooks, componentes, chaves de query, eventos) em inglês. |
| ENG-06 | Índices de busca, prefixo do S3 e chaves do IndexedDB em inglês. |
| ENG-07 | Texto para o usuário segue em pt-BR (tela por `t()`, e-mail, iCal, PDF, Word); as chaves do dicionário não mudam. |
| ENG-08 | `pnpm run check`, build do web, seed refeito, `pnpm docs:sync` sem erro e UAT no navegador com as três contas, no desktop e no celular, em todas as telas. |
| ENG-09 | Documentação (`feature.md`, `apps/api/CLAUDE.md`, `docs/architecture.md`, `docs/glossary.md`, skills) cita os caminhos e nomes novos. |

## Glossário proposto (pergunta 2)

Convenções: data de calendário `YYYY-MM-DD` (AD-103) leva sufixo `Date`; instante (`Date`) leva sufixo `At`; dinheiro mantém `Cents`; campo-ref segue a convenção atual (nome do model, maiúsculo). Valores de domínio já gravados (AD-113) não mudam e o glossário se alinha a eles.

| Português | Inglês | Exemplos de uso |
| --- | --- | --- |
| perícia | `ExpertCase` / `expertCase` | model `ExpertCase`, `expertCaseId`, módulo `expert-case`, `EXPERT_CASE_STATUS` (rota já é `/expert-cases`) |
| número do processo | `caseNumber` | `numeroProcesso` → `caseNumber` |
| justiça | `jurisdiction` | valores `labor`/`civil`/`federal` |
| tribunal · vara · comarca | `court` · `division` · `district` | |
| papel (na perícia) | `role` | valores `court_expert`/`technical_assistant` |
| objeto | `subject` | |
| etapa · fase · situação | `status` · `phase` · `state` | `PERICIA_FASES` → `EXPERT_CASE_PHASES`, `?situacao=` → `?state=` |
| nomeação | `appointment` | `dataNomeacao` → `appointmentDate` (casa com o valor `appointed`) |
| laudo | `ExpertReport` / `report` | model `ExpertReport` (rota `/expert-reports`, tipo `report`) |
| parecer técnico | `technical opinion` | tipo `technical_opinion` (já) |
| modelo de laudo | `ReportTemplate` | model `ReportTemplate` (módulo da matriz `report_templates`) |
| seção · variável | `section` · `variable` | `secoes` → `sections`, `LAUDO_VARIAVEIS` → `REPORT_VARIABLES` |
| compromisso | `CalendarEvent` | model `CalendarEvent`, `calendarEventKeys` (o tipo `inspection` já existe) |
| vistoria (registro de campo) | `Inspection` | model `Inspection` (rota `/inspections`) |
| presentes · paradigmas · funções · agentes · EPI | `attendees` · `comparators` · `jobs` · `agents` · `ppe` | |
| mídia · legenda · assinatura | `media` · `caption` · `signature` | |
| prazo | `Deadline` | model `Deadline`, `vencimento` → `dueDate`, `protocoladoEm` → `filedDate` |
| honorário (proposto · fixado) | `fee` (`proposedFeeCents` · `fixedFeeCents`) | categorias `fixed_fees`/`contracted_fees` (já) |
| lançamento | `FinanceEntry` | model `FinanceEntry` (rota `/finance/entries`), `natureza` → `kind`, `liquidadoEm` → `settledDate` |
| parcela · recebimento | `installment` | `parcelas` → `installments` (rota `/installments`) |
| valor | `amountCents` | `valorCents` → `amountCents` |
| parte · advogado · polo | `Party` · `lawyer` · `side` | model `Party`, `partes` → `parties` |
| contratante | `client` | `contratante: true` → `client: true` |
| movimentação | `movement` | `movimentacoes` → `movements` |
| oportunidade | `Opportunity` | model `Opportunity`; `orgaoJulgador` → `courtUnit`, `dataAjuizamento` → `filingDate` |
| prospecção · financeiro · documentos | `prospecting` · `finance` · `documents` | pastas de módulo da API |
| diário de bordo · atividade | `activity log` · `Activity` | model `Activity`; `modulo`/`acao`/`recurso`/`rotulo` → `module`/`action`/`resource`/`label` |
| permissões | `permissions` | `permissoes` → `permissions` |
| aviso (de agendamento · de prazo) | `notice` · `reminder` | `avisoAgendamento` → `scheduleNotice`, `avisoPrazoEmail` → `deadlineReminderEmail` |
| perícia parada | `stalled` | `listParadas` → `listStalled` (rota `/stalled`, já) |
| título · nome · tipo · descrição · observações · categoria | `title` · `name` · `type` · `description` · `notes` · `category` | |
| cabeçalho · rodapé | `header` · `footer` | `Tenant.cabecalho`/`rodape` |

O mapa completo campo a campo fica no `design.md`, depois da resposta.

## Respostas do usuário (2026-11-01)

As quatro perguntas viraram **AD-139 a AD-142** (`.specs/STATE.md`): alcance com **comentários
incluídos**; glossário na **variante curta** (`Case`, `Report`, `Template`, `Appointment`,
`Transaction`, `processNumber`), não a tabela proposta acima; banco sem migração (seed refeito);
um PR com um commit por fatia de domínio. A tabela final está em `design.md`. A coluna
"Confirmed?" abaixo ficou como estava no momento da pergunta.

## Assumptions & Open Questions

| Pergunta | Recomendação | Confirmed? |
| --- | --- | --- |
| 1. Alcance | Campos e payloads, parâmetros de URL, models e collections, pastas e arquivos, identificadores internos; **sem** comentários e com as exceções da tabela acima | No |
| 2. Glossário | A tabela acima | No |
| 3. Banco | Sem migração: seed refeito, índices de busca reprovisionados (como AD-112, AD-113, AD-117) | No |
| 4. Ordem e PRs | Um PR só, com um commit por fatia de domínio (db + contrato + API + web juntos), cada commit com `pnpm run check` verde; base `feat/gestao-escritorio` enquanto o PR #9 não entra na `main` | No |
| Slug | `english-naming` | No |

## Success Criteria

- [ ] Uma busca pelos termos do inventário (`grep -riE 'pericia|lancamento|compromisso|vistoria|laudo|oportunidade|prazo|parte'` em nomes de arquivo e identificadores) não acha nada fora das exceções e dos comentários.
- [ ] `pnpm run check`, build do web e `pnpm docs:sync` passam.
- [ ] Seed refeito; UAT com admin, gestor e operador, no desktop e no celular, em todas as telas, sem erro no console.
