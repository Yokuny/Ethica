# Painel da Automação Datajud — Specification

**Origem**: pedido do usuário em 2026-11-28. Evolui a página Automação Datajud (`automacao-datajud`, AD-281) e a lista de processos acompanhados (`processos-acompanhados`). Segue o Dashboard (`dashboard`, AD-255, AD-313) e o guia `dashboard-design`. Prefixo de requisito: `PAT`. Feature grande (dado novo no worker, rota nova, página refeita): `spec.md` → `design.md` → `tasks.md`.

## Problem Statement

A Automação Datajud trabalha sozinha: todo dia o worker consulta os processos no tribunal e gera avisos e sugestões. A página `/automation` só mostra o número de sugestões para aprovar e a lista de processos. A perita não vê **quanto a automação fez por ela** no período (movimentos detectados, avisos, sugestões, quantas aprovou) nem se as consultas estão acontecendo todo dia. A lista não diz qual processo mudou por último, que é o que ela procura ao abrir a página.

## Goals

- [ ] A página vira um painel, do macro ao micro: números do período no topo, a atividade mês a mês, a composição das sugestões e, no fim, a lista dos processos acompanhados.
- [ ] "Para aprovar" deixa de ser um bloco e vira um número da faixa, com link para a aba da Central.
- [ ] A lista dos processos vai para um `DataTable` paginado e ordenado no servidor, com o processo que mudou por último no topo.
- [ ] O worker grava o que fez em cada dia, por escritório, para mostrar a constância das consultas.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Módulo `analytics` que junte os painéis | Decidido em 2026-11-28: o painel fica no módulo `automation`, como cada área tem o próprio `/dashboard` (case e finance). |
| Reconsultar um processo pela tela | Fora do escopo desde `processos-acompanhados`; o Datajud tem defasagem e limite de uso. |
| Aprovar sugestão pela página | A aprovação continua na Central (`/notifications`, aba Para aprovar) e no serviço. |
| Perícias cíveis (TJ) | Continuam fora do acompanhamento (AD-277). |
| Diagnóstico técnico das falhas (429, tempo esgotado) | Continua no log e nas métricas do worker (AD-287); a página mostra só "sem resposta do tribunal". |

---

## Assumptions & Open Questions

Decidido com o usuário em 2026-11-28: módulo `automation` na API; período de 6 ou 12 meses como o Dashboard; avisos do Datajud guardados por mais tempo; uma linha por escritório e por dia com o que o worker fez. Confirmados também, em 2026-11-28, a faixa, o gráfico do meio, a ordem da lista e os 25 meses. Os demais seguem o padrão proposto no design.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quanto tempo os avisos do Datajud ficam guardados | 25 meses (hoje 180 dias) | Com 12 meses, a comparação com os 12 anteriores precisa de 24 meses mais o mês em andamento, como o Dashboard (AD-256) | Yes (2026-11-28) |
| Os cinco números da faixa | Processos acompanhados (hoje), Movimentações detectadas, Avisos enviados, Sugestões feitas (com quantas foram aprovadas) e Para aprovar (hoje) | Mostram o volume do trabalho da automação e o que espera a perita; os de "hoje" não têm comparação | Yes (2026-11-28) |
| Gráfico do meio | Atividade mês a mês: movimentações detectadas e sugestões feitas em linhas, e os dias com consulta ao tribunal | Mostra a evolução e se a consulta diária aconteceu | Yes (2026-11-28) |
| Composição | Rosca das sugestões do período pelo que aconteceu com elas: aprovadas, recusadas, vencidas, substituídas e aguardando | Responde "a automação acerta?"; a rosca segue o limite de 4 partes + "Demais" (AD-256) | No |
| Ordem da lista | Pela última movimentação no tribunal, a mais recente primeiro; sem movimentação, no fim, pela situação (não encontrado, sem resposta, aguardando) | "Alterações recentes" do pedido; o que nunca mudou não disputa o topo | Yes (2026-11-28) |
| Colunas da lista | Processo (abre o serviço), Tribunal, Última movimentação (nome e data), Situação e Última consulta | O que a perita precisa para decidir se abre o serviço | No |
| Busca e filtro da lista | Busca pelo número; filtro pela situação | Mesmo padrão das outras listas (AD-193) | No |
| Números da faixa e permissão | Sugestões de dinheiro (recebimento) só contam para quem vê o Financeiro, como na Central (AD-137) | O número não pode mostrar o que a lista da Central esconde | No |
| Começo do histórico | A linha por dia começa a ser gravada na entrega; antes disso, os meses aparecem sem consulta registrada | Não há como reconstruir as rodadas antigas | No |

---

## User Stories

### P1: Números do período — PAT-01

1. WHEN o escritório tem o módulo THEN the system SHALL mostrar a faixa com Processos acompanhados, Movimentações detectadas, Avisos enviados, Sugestões feitas e Para aprovar.
2. WHEN o número é do período (movimentações, avisos, sugestões) THEN the system SHALL compará-lo ao período anterior de mesmo tamanho, só com meses completos, com tendência e linha mês a mês, como o Dashboard (AD-255, AD-256).
3. WHEN há sugestões aguardando aprovação THEN the system SHALL mostrar o número em Para aprovar com link para a aba Para aprovar da Central; o bloco de hoje sai da página.
4. WHEN o escritório não tem o módulo THEN the system SHALL mostrar só a oferta, sem chamar a API (AD-276, como hoje).

### P1: Período — PAT-02

1. WHEN a perita escolhe 6 ou 12 meses no cabeçalho THEN the system SHALL usar esse período em toda a página, guardado na URL, como no Dashboard.

### P1: Lista dos processos acompanhados — PAT-03

1. WHEN a página abre THEN the system SHALL listar no fim, num `DataTable` paginado no servidor, todo serviço acompanhado (regra de `processos-acompanhados`, PAC-01), com o processo de movimentação mais recente primeiro.
2. WHEN a perita busca um número ou filtra pela situação THEN the system SHALL filtrar no servidor, com o filtro na URL.
3. WHEN a perita clica numa linha THEN the system SHALL abrir o serviço.

### P2: Atividade mês a mês — PAT-04

1. WHEN o período tem atividade THEN the system SHALL mostrar, por mês, as movimentações detectadas, as sugestões feitas e os dias com consulta ao tribunal, com eixo a partir de zero.
2. WHEN a perita quer o número exato THEN the system SHALL mostrá-lo recolhido em "Ver mês a mês" (AD-255).

### P2: O que aconteceu com as sugestões — PAT-05

1. WHEN o período tem sugestões THEN the system SHALL mostrar a rosca pelo desfecho (aprovadas, recusadas, vencidas, substituídas, aguardando), com total no centro e valor e percentual escritos.

### P1: Registro diário do worker — PAT-06

1. WHEN o worker consulta os processos de um escritório no dia THEN the system SHALL somar, numa linha por escritório e por dia, os processos acompanhados, os que tiveram resposta do tribunal, os encontrados, os não encontrados e as movimentações novas.
2. WHEN um lote falha e é tentado de novo THEN the system SHALL contar o processo uma vez só no dia.
3. WHEN o lote desiste no dia (AD-286) THEN the system SHALL deixar o processo como sem resposta naquele dia.

### ~~P2: Avisos guardados por mais tempo — PAT-07~~ (retirado no design, 2026-11-28: o painel conta os avisos pelo registro diário)

1. WHEN o worker grava um aviso de movimentação ou de pagamento no tribunal THEN the system SHALL guardá-lo pelo tempo da primeira linha de "Assumptions", para que o período de 12 meses e o anterior fechem a conta.

---

## Success Criteria

- [ ] A perita responde, sem sair da página, "quanto a automação fez nos últimos 6 meses" e "qual processo mudou por último".
- [ ] Os números batem com a Central (sugestões e avisos) e com a seção No tribunal de cada serviço.
- [ ] Sem o módulo, nenhuma chamada à API de automação.
