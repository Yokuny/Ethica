# Gestão do escritório — Specification

**Origem**: onda 6 da gap analysis `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (tabelas "Processos / perícias" e "Administração, relatórios e plataforma", seção 2 itens s–w, seção 3 decisão 5, seção 5 "Jornada do assistente técnico" e "Matriz de permissões"); inventário `.specs/features/benchmark-jusperia/2026-10-31-jusperia-inventario.md` §1, §2.5, §6, §11, §14 e as respostas do usuário. Prefixo de requisito: `GES`.

## Problem Statement

O Ethica já cobre prazos, honorários, documentos, laudo e campo, mas o escritório ainda não consegue responder a perguntas de gestão: **quem fez o quê** (não há registro de ações; a única trilha é `Tenant.dataExports`, AD-122), **em que pé está cada perícia** além das 8 etapas (o concorrente tem 29 fases em 5 grupos e deriva ativo/suspenso/encerrado), **quanto o assistente técnico tem a receber de quem o contratou** (o honorário do Ethica só nasce do valor fixado pelo juízo, AD-106) e **o que cada pessoa quer ver no início**. Perícia parada (60 dias, AD-121) só aparece num PDF em `/relatorios`.

## Goals

- [ ] O admin consulta um diário de bordo com quem, quando, módulo, ação e registro afetado, filtrável.
- [ ] Cada perícia mostra uma fase detalhada e uma situação (ativa, suspensa, encerrada) sem depender de o perito lembrar de mudar duas coisas.
- [ ] Na perícia em que o escritório é assistente técnico, o honorário cobrado da parte contratante é cadastrado e aparece no financeiro e nos relatórios.
- [ ] Cada pessoa escolhe os blocos do início; perícias paradas aparecem no dia a dia, não só no PDF.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Toggle de "jornada" perito × assistente na conta inteira (concorrente) | No Ethica o papel é **por perícia** (`papel`); um escritório atua nos dois. |
| Diário de bordo exportável em PDF/CSV | Consulta na tela basta para a primeira rodada; a exportação ZIP (AD-122) já existe. |
| Fases criadas pelo usuário | Lista fixa como no concorrente; cadastro de fases é complexidade sem pedido. |
| Relatório de produtividade de campo | Valor ★; não pedido nesta onda. |

---

## Já existe (não refazer)

| Item da onda | O que já há | Lacuna |
| --- | --- | --- |
| (t) Processos ociosos | `periciaService.listParadas` (regra dos 60 dias, AD-121) e o PDF "Perícias paradas" em `/relatorios` | Não aparece no início nem como filtro da listagem. |
| (v) Assistente técnico | `papel: technical_assistant` na perícia; parecer técnico com modelo próprio (LAU-06, AD-127) | Honorário pago pela parte contratante ("Contratante"). |
| (s) Diário de bordo | `Tenant.dataExports` (quem exportou, AD-122); event bus in-process (AD-039) | Registro geral de ações. |
| (u) Fases | 8 etapas (`PERICIA_STATUS`); concluir laudo avança para `report_delivered` (AD-126) | Fase detalhada e situação derivada. |
| (w) Dashboard | Início fixo (`apps/web/src/routes/_private/index.tsx`): faixa de indicadores, próximos compromissos, fluxo de caixa (admin/manager), perícias por etapa e por justiça, atalhos | Mostrar/ocultar blocos. |

---

## Respostas do usuário (2026-11-01)

Perguntas 1 a 4 e a rodada de complemento sobre a matriz viraram **AD-133 a AD-137** (`.specs/STATE.md`): etapa + fase detalhada com situação derivada; diário só de escrita, 1 ano, só admin, substituindo `Tenant.dataExports`; contratante = parte da perícia e início por usuário; GES-01 a GES-06 com a matriz de permissões **sem migração**, por membro com preset do perfil e quatro ações (ver, inserir, editar, excluir). A coluna "Confirmed?" abaixo ficou como estava no momento da pergunta.

## Assumptions & Open Questions

| Assumption / decision | Chosen default (recomendação) | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Slug | `gestao-escritorio` | Itens de governança do escritório | No |
| Fases (pergunta 1) | **Pendente**: manter as 8 etapas e acrescentar **fase detalhada** (lista fixa agrupada por etapa) com **situação derivada** da etapa/fase (`active`/`suspended`/`closed`), ou ampliar `PERICIA_STATUS` para ~29 valores | Etapas alimentam gráficos, regra de parada (AD-121) e o avanço do laudo (AD-126); trocar o enum mexe em tudo | No |
| Automação de etapa (pergunta 1) | **Pendente**: concluir laudo com entrega segue avançando para `report_delivered` e põe a fase "Laudo entregue – aguardar manifestação" | Mantém AD-126 | No |
| Diário de bordo (pergunta 2) | **Pendente**: só escrita (criar, editar, excluir, protocolar, receber, estornar, concluir laudo, exportar, entrar/sair); quem, quando, módulo, ação, registro (id + rótulo); guarda 1 ano (TTL); só admin vê; substitui `Tenant.dataExports` | Leitura multiplicaria o volume sem pedido; LGPD pede prazo de guarda | No |
| Gravação do diário | Chamada direta e sem `await` bloqueante a `auditoriaService.registrar` a partir de cada controller/service de escrita, ou eventos do bus — decidir no design | AD-039: efeito que a resposta não usa → evento; mas um evento por ação vira dezenas de tipos | No |
| Honorário do assistente (pergunta 3) | **Pendente**: na perícia `technical_assistant`, "Contratante" = uma das partes da perícia (ou o advogado dela); honorário contratado gera a receita `contracted_fees` com parcelas (AD-111), no lugar do honorário fixado pelo juízo | O assistente não tem honorário fixado pelo juízo | No |
| Dashboard (pergunta 3) | **Pendente**: por usuário (`preferences.homeBlocks`), mostrar/ocultar e "restaurar padrão"; blocos = os de hoje + "Perícias paradas"; blocos financeiros continuam só para admin/manager | Cada papel olha coisas diferentes | No |
| Escopo e permissões (pergunta 4) | **Pendente**: GES-01 a GES-05 nesta rodada; AD-108 continua fora, telas novas com os papéis da AD-107 (diário só admin) | A matriz é G e mexe em todas as rotas | No |
| Datas | Fase e situação não têm data própria; diário grava instante UTC (AD-036/AD-103) | — | No |
| Valores de domínio | Fase, situação, módulo e ação do diário em chave inglesa, traduzidos no web (AD-113) | — | No |

---

## User Stories

### P1: Diário de bordo ⭐ MVP — GES-01

**User Story**: Como admin do escritório, quero ver quem fez cada alteração e quando, para responder por um prazo perdido ou um honorário estornado.

**Acceptance Criteria**:

1. WHEN alguém do tenant cria, altera ou exclui um registro (perícia, prazo, parte, compromisso, vistoria, lançamento/parcela, laudo, modelo, escritório, usuário/convite) ou exporta dados THEN the system SHALL gravar uma entrada com usuário, data e hora, módulo, ação e o registro afetado (id e rótulo legível, ex. número do processo).
2. WHEN o admin abre o diário THEN the system SHALL listar as entradas da mais recente para a mais antiga, paginadas no servidor, com filtros por período, usuário, módulo e ação, e link para o registro quando ele ainda existe.
3. WHEN quem não é admin tenta abrir o diário THEN the system SHALL recusar (403 na API; item escondido no web).
4. WHEN a gravação do diário falha THEN the system SHALL concluir a ação do usuário mesmo assim e registrar o erro no log.
5. WHEN a entrada passa do prazo de guarda decidido THEN the system SHALL apagá-la sozinho.

**Independent Test**: como operador, protocolar um prazo; como admin, ver a entrada no diário com o nome do operador e o número do processo.

### P1: Fase detalhada e situação — GES-02

**User Story**: Como perito, quero marcar a fase em que a perícia está (ex. "Responder impugnação 2") e ver se ela está ativa, suspensa ou encerrada, sem duplicar trabalho.

**Acceptance Criteria**:

1. WHEN o perito edita a perícia THEN the system SHALL oferecer a fase detalhada agrupada, conforme a decisão da pergunta 1.
2. WHEN a fase muda THEN the system SHALL derivar a situação (`active`/`suspended`/`closed`) no servidor (nunca só no cliente, defeito do concorrente §2.5) e mostrá-la na listagem e no detalhe.
3. WHEN o perito filtra a listagem THEN the system SHALL filtrar por situação e por fase.
4. WHEN um laudo é concluído com a entrega (AD-126) THEN the system SHALL atualizar etapa e fase de forma coerente.
5. WHEN a perícia está suspensa ou encerrada THEN the system SHALL tirá-la da regra de perícia parada.

### P2: Honorário do assistente técnico pela parte contratante — GES-03

**User Story**: Como assistente técnico, quero registrar quem me contratou e o honorário combinado, para cobrar e ver o que falta receber.

**Acceptance Criteria**:

1. WHEN a perícia é de `technical_assistant` THEN the system SHALL permitir indicar o contratante e o honorário contratado no cadastro/edição.
2. WHEN o honorário contratado é informado ou alterado THEN the system SHALL lançar ou atualizar a receita a receber ligada à perícia, com parcelas e as regras da AD-111.
3. WHEN admin ou manager vê o financeiro ou os relatórios THEN the system SHALL mostrar o contratante junto da receita e permitir distinguir honorário fixado pelo juízo de honorário contratado.
4. WHEN o operador vê a perícia THEN the system SHALL mostrar o contratante, mas nenhum valor (AD-107).

### P2: Início configurável — GES-04

**User Story**: Como usuário, quero escolher os blocos do início para ver só o que uso.

**Acceptance Criteria**:

1. WHEN o usuário abre "Personalizar" no início THEN the system SHALL listar os blocos que o papel dele pode ver, com mostrar/ocultar e "Restaurar padrão".
2. WHEN o usuário salva THEN the system SHALL guardar a escolha conforme a decisão (por usuário ou por escritório) e refletir em qualquer aparelho.
3. WHEN o papel não vê financeiro THEN the system SHALL nunca oferecer nem mostrar blocos financeiros, mesmo que a preferência os tenha.

### P1: Matriz de permissões — GES-06

**User Story**: Como admin, quero definir o que cada membro pode ver, inserir, editar e excluir em cada módulo, para que a secretaria cuide do financeiro e da agenda e a equipe técnica das perícias e laudos.

**Acceptance Criteria**:

1. WHEN o admin convida um membro THEN the system SHALL pedir o perfil (Gestor ou Operador), preencher a matriz módulo × ação com o preset do perfil e deixar ajustar antes de enviar.
2. WHEN o admin abre um membro em Usuários THEN the system SHALL mostrar e permitir alterar a matriz dele; o admin não tem matriz (tem tudo).
3. WHEN um membro chama uma rota sem a ação no módulo THEN the system SHALL responder 403 antes de tocar dados, e o web SHALL esconder o menu, a rota e o botão correspondentes.
4. WHEN o admin altera a matriz THEN the system SHALL valer na próxima requisição do membro, sem novo login.
5. WHEN o membro não tem `view` em financeiro THEN the system SHALL não mostrar valores em nenhuma tela ou PDF (regra da AD-107, agora pela matriz).

### P3: Perícias paradas no dia a dia — GES-05

**Acceptance Criteria**:

1. WHEN o usuário abre o início THEN the system SHALL mostrar o bloco "Perícias paradas" (quantidade e as mais antigas, com dias sem movimentação), cada uma com link para a perícia e um link para o relatório em PDF.
2. WHEN o bloco calcula as paradas THEN the system SHALL aplicar a mesma regra do PDF (AD-121, `PERICIA_PARADA_DIAS`), sem as suspensas (AD-133).

---

## Edge Cases

- Perícia excluída SHALL manter as entradas do diário (rótulo gravado), sem link.
- Usuário removido/inativo SHALL continuar aparecendo pelo nome gravado na entrada.
- Ação em lote (importação CSV) SHALL gravar uma entrada por lote com a contagem, não uma por linha.
- Ação automática (prazo "Entrega do laudo" criado com a perícia, receita do honorário fixado) SHALL ser atribuída ao usuário que disparou a ação de origem.
- Perícia que deixa de ser `technical_assistant` com honorário contratado já recebido SHALL manter o lançamento (honorário nunca é excluído, AD-111).
- Preferência do início com um bloco que deixou de existir SHALL ser ignorada.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| GES-01 | P1: Diário de bordo | Execute | Verified |
| GES-02 | P1: Fase detalhada e situação | Execute | Verified |
| GES-03 | P2: Honorário do assistente pela parte contratante | Execute | Verified |
| GES-04 | P2: Início configurável | Execute | Verified |
| GES-05 | P3: Perícias paradas no dia a dia | Execute | Verified |
| GES-06 | P1: Matriz de permissões | Execute | Verified |

## Success Criteria

- [ ] Toda escrita do tenant aparece no diário com autor e registro, e o operador não o vê.
- [ ] Nenhuma combinação etapa × fase × situação incoerente pode ser gravada pela API.
- [ ] O assistente técnico vê no financeiro o que tem a receber de cada contratante.
