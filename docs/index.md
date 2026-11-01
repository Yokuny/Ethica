<!-- GERADO por scripts/docs/sync-docs.mjs — não edite à mão. Rode `pnpm docs:sync`. -->

# Gateway de documentação — Ethica

Ponto de entrada obrigatório antes de qualquer tarefa (protocolo em [`AGENTS.md`](../AGENTS.md)).
Cada feature tem **um** registro vivo em `docs/features/<slug>/feature.md`; spec, design, tasks,
validação e planos (congelados) ficam em `.specs/features/<slug>/`. Decisões: `.specs/STATE.md`.

## Em andamento

- [`avisos-notificacoes`](features/avisos-notificacoes/feature.md) — **planejado** — Varredura agendada dos avisos sem perda nem duplicidade, aviso de vencimento financeiro e notificação push no aparelho
- [`contatos-varas`](features/contatos-varas/feature.md) — **planejado** — Agenda de contatos das varas do trabalho e cíveis do escritório, filtrável por estado e cidade, com importação por planilha
- [`fundacao-ethica`](features/fundacao-ethica/feature.md) — **parcial** — Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção
- [`gestao-membros`](features/gestao-membros/feature.md) — **planejado** — Admin edita nome e perfil, desativa e reativa membros e gerencia convites pendentes, sem mexer no banco
- [`laudo-vistoria`](features/laudo-vistoria/feature.md) — **planejado** — Relatório fotográfico e anotações da vistoria no laudo, reabrir laudo concluído e excluir com confirmação explícita
- [`producao-api`](features/producao-api/feature.md) — **planejado** — Dockerfile de produção com Chromium e storage S3 em pastas por escritório e perícia, trocável para o bucket real só por configuração
- [`rotas-vistoria`](features/rotas-vistoria/feature.md) — **planejado** — Mapa do dia saindo de um endereço escolhido (localização, escritório ou digitado) com a rota calculada por serviço de rota próprio

## Planos não arquivados (`.specs/plans/`)

_Nenhum._

## Features (16)

| Feature | O que faz | Status | Atualizado | Áreas | Spec | Planos |
| --- | --- | --- | --- | --- | --- | --- |
| [Avisos de vencimento e notificações push](features/avisos-notificacoes/feature.md) | Varredura agendada dos avisos sem perda nem duplicidade, aviso de vencimento financeiro e notificação push no aparelho | planejado | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/avisos-notificacoes) | — |
| [Benchmark da Jusperia](features/benchmark-jusperia/feature.md) | Engenharia reversa funcional do app da Jusperia (concorrente) e gap analysis contra o Ethica, com priorização em ondas | concluido | 2026-11-01 | `docs` | [spec](../.specs/features/benchmark-jusperia) | 1 |
| [Campo e vistorias](features/campo-vistorias/feature.md) | Rota de campo no celular com registro de vistoria, fotos, áudio e assinatura offline, mapa do dia, aviso às partes e campo no laudo | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/campo-vistorias) | — |
| [Contatos das varas](features/contatos-varas/feature.md) | Agenda de contatos das varas do trabalho e cíveis do escritório, filtrável por estado e cidade, com importação por planilha | planejado | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/contatos-varas) | — |
| [Base de documentos](features/documentos-pdf/feature.md) | Identidade do escritório, dados profissionais, PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `infra` | [spec](../.specs/features/documentos-pdf) | — |
| [Nomes de código em inglês](features/english-naming/feature.md) | Todo nome definido no código (campo, model, collection, módulo, arquivo, parâmetro, evento, comentário) em inglês, com um termo por conceito | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `tests` `docs` | [spec](../.specs/features/english-naming) | — |
| [Fundação do Ethica](features/fundacao-ethica/feature.md) | Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção | parcial | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `packages/ui` `harness` `docs` `infra` `tests` | [spec](../.specs/features/fundacao-ethica) | 1 |
| [Gestão do escritório](features/gestao-escritorio/feature.md) | Matriz de permissões por membro, diário de bordo, fase e situação da perícia, honorário do assistente técnico e início configurável | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `harness` | [spec](../.specs/features/gestao-escritorio) | — |
| [Gestão de membros pelo admin](features/gestao-membros/feature.md) | Admin edita nome e perfil, desativa e reativa membros e gerencia convites pendentes, sem mexer no banco | planejado | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` | [spec](../.specs/features/gestao-membros) | — |
| [Importação de processos](features/importacao-processos/feature.md) | Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis e dados trabalhistas | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/importacao-processos) | — |
| [Montagem do laudo](features/laudo-montagem/feature.md) | Seções e modelo editáveis no rascunho, modelo trabalhista completo, pré-preenchimento pelo processo, pré-visualização e fotos 2x3 nos anexos | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` | [spec](../.specs/features/laudo-montagem) | — |
| [Vistoria no laudo e revisão do laudo](features/laudo-vistoria/feature.md) | Relatório fotográfico e anotações da vistoria no laudo, reabrir laudo concluído e excluir com confirmação explícita | planejado | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` | [spec](../.specs/features/laudo-vistoria) | — |
| [Laudo automatizado](features/laudos/feature.md) | Modelos de laudo por seções sim/não com variáveis do processo, parecer técnico e exportação em PDF e Word | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/laudos) | — |
| [Prazos e recebimentos](features/prazos-recebimentos/feature.md) | Vários prazos por perícia com protocolo, recebimento parcial de honorários, feed iCal e aviso de prazo por e-mail | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/prazos-recebimentos) | — |
| [Imagem de produção da API e arquivos por perícia](features/producao-api/feature.md) | Dockerfile de produção com Chromium e storage S3 em pastas por escritório e perícia, trocável para o bucket real só por configuração | planejado | 2026-11-01 | `apps/api` `infra` | [spec](../.specs/features/producao-api) | — |
| [Rotas de vistoria com ponto de partida](features/rotas-vistoria/feature.md) | Mapa do dia saindo de um endereço escolhido (localização, escritório ou digitado) com a rota calculada por serviço de rota próprio | planejado | 2026-11-01 | `apps/api` `apps/web` `packages/db` | [spec](../.specs/features/rotas-vistoria) | — |

## Por área

- **`apps/api`** — [avisos-notificacoes](features/avisos-notificacoes/feature.md), [campo-vistorias](features/campo-vistorias/feature.md), [contatos-varas](features/contatos-varas/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [gestao-membros](features/gestao-membros/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudo-montagem](features/laudo-montagem/feature.md), [laudo-vistoria](features/laudo-vistoria/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [producao-api](features/producao-api/feature.md), [rotas-vistoria](features/rotas-vistoria/feature.md)
- **`apps/web`** — [avisos-notificacoes](features/avisos-notificacoes/feature.md), [campo-vistorias](features/campo-vistorias/feature.md), [contatos-varas](features/contatos-varas/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [gestao-membros](features/gestao-membros/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudo-montagem](features/laudo-montagem/feature.md), [laudo-vistoria](features/laudo-vistoria/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [rotas-vistoria](features/rotas-vistoria/feature.md)
- **`docs`** — [benchmark-jusperia](features/benchmark-jusperia/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`harness`** — [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md)
- **`infra`** — [documentos-pdf](features/documentos-pdf/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [producao-api](features/producao-api/feature.md)
- **`packages/contracts`** — [avisos-notificacoes](features/avisos-notificacoes/feature.md), [campo-vistorias](features/campo-vistorias/feature.md), [contatos-varas](features/contatos-varas/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [gestao-membros](features/gestao-membros/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudo-montagem](features/laudo-montagem/feature.md), [laudo-vistoria](features/laudo-vistoria/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md)
- **`packages/db`** — [avisos-notificacoes](features/avisos-notificacoes/feature.md), [campo-vistorias](features/campo-vistorias/feature.md), [contatos-varas](features/contatos-varas/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [rotas-vistoria](features/rotas-vistoria/feature.md)
- **`packages/ui`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`tests`** — [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)

## Decisões recentes

Últimas 10 de [`.specs/STATE.md`](../.specs/STATE.md#decisions) (ADRs longos em [`docs/adr/`](adr/README.md)).

- **AD-152** (2026-11-01, active) — O pré-preenchimento do laudo pelo PDF do processo completo (quesitos, dados trabalhistas, pedidos da inicial) é feito por regras sobre o tex
- **AD-151** (2026-11-01, active) — A agenda de contatos das varas (do trabalho e cíveis) é um cadastro do escritório, que começa vazio e cresce pela tela ou por planilha; o Et
- **AD-150** (2026-11-01, active) — O mapa do dia ganha ponto de partida escolhido (localização, endereço do escritório ou endereço digitado, lembrado por pessoa no servidor) e
- **AD-149** (2026-11-01, active) — Laudo concluído pode ser reaberto ("Editar laudo") por quem tem `expert_reports` `update`: volta a rascunho sem desfazer prazo protocolado,
- **AD-148** (2026-11-01, active) — Membros do escritório têm CRUD só do admin: convidar (já existe), editar nome e perfil, desativar e reativar, e cancelar ou reenviar convite
- **AD-147** (2026-11-01, active) — Os avisos (prazos hoje; financeiro e push em `avisos-notificacoes`) passam a sair de uma varredura agendada (cron no processo da API, a cada
- **AD-146** (2026-11-01, active) — As chaves do storage S3 (AD-120) passam a ser por escritório e por perícia: `tenants/<tenantId>/office/…` para o que é do escritório (logo)
- **AD-145** (2026-11-01, active) — Não serão escritos testes e2e de router para `case`, `agenda`, `finance` e `prospecting` além dos que já existem; a cobertura atual (unit de
- **AD-144** (2026-11-01, active) — O escritório (tenant) é cadastrado só com CNPJ; perito pessoa física (CPF) não é suportado. `provisionTenantSchema` continua exigindo 14 díg
- **AD-143** (2026-11-01, active) — A partir de 2026-11-01 o Ethica é desenvolvido pela própria perita (engenheira, usuária final do produto, sem formação em programação) com u

## `.specs/` sem registro em `docs/features/`

- `.specs/features/prospeccao-datajud/`

## Outros documentos

- [Arquitetura](architecture.md) · [Glossário](glossary.md) · [Roadmap](roadmap.md) · [Posicionamento](positioning.md) · [ADRs](adr/README.md)
- Produto: [`PRODUCT.md`](../PRODUCT.md) · Operação local: [`RUN_BOOK.md`](../RUN_BOOK.md)
- Template de registro: [`docs/templates/feature-doc.md`](templates/feature-doc.md)
