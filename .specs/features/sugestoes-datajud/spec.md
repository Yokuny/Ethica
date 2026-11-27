# Sugestões do Datajud no serviço e no financeiro — Specification

**Origem**: pedido do usuário em 2026-11-26/27, sobre a descoberta `.specs/features/sugestoes-datajud/plans/2026-11-26-conteudo-dos-movimentos.md`
(papel de cada fonte). Evolui a `automacao-datajud` (AD-268 a AD-280): o Datajud fica como a fonte do **estado do
processo em código** (TPU do CNJ) e do **preenchimento do serviço pelo número**; o conteúdo das publicações e a
descoberta de nomeações vêm do DJEN, em spec própria. Prefixo de requisito: `SGD`.

## Problem Statement

O Datajud só diz **o que aconteceu** no processo, em código: não traz texto, destinatário nem partes. Hoje esses
códigos já viram avisos e sugestões (suspensão, acordo, desistência, sentença, alvará), mas a sugestão fica numa
lista na seção No tribunal e na Central: a perita não vê, ao lado do dado, que existe uma mudança esperando por ela,
e não há tela de detalhe do lançamento para onde levar a sugestão de recebimento. Faltam as regras de "hora de cobrar
os honorários" e "hora de encerrar o serviço", três códigos da regra de suspensão estão trocados (são de **retomada**
na TPU) e o cadastro do serviço não aproveita o que o tribunal já sabe do processo (vara, data de ajuizamento,
assuntos).

## Goals

- [ ] Toda sugestão (situação, fase, recebimento, preenchimento) aparece **perto do dado que ela altera**, no serviço
      ou no lançamento, com um botão de destaque da inteligência, e no cabeçalho da página.
- [ ] Da notificação a perita aceita, rejeita ou **abre o serviço ou o lançamento** para conferir antes.
- [ ] O Financeiro ganha a tela de detalhe do lançamento.
- [ ] Regras de situação completas pela TPU (suspensão, retomada, arquivamento), hora de cobrar os honorários e hora
      de encerrar o serviço.
- [ ] Preenchimento pelo número de duas formas: **na hora**, com o botão ao lado do número no cadastro, e **pela
      automação**, como sugestão quando o acompanhamento encontra o processo e o serviço tem campos vazios.
- [ ] Continua valendo: **nada muda sem a confirmação da pessoa** (AD-268); pagamento só com valor, data e conta
      confirmados (AD-269).

## Out of Scope

| Feature | Reason |
| --- | --- |
| DJEN: texto das intimações, link do PJe, descoberta de nomeações | Spec própria, logo depois desta (o DJEN não tem código de situação nem alvará; o Datajud não tem texto) |
| Conteúdo do alvará (valor, beneficiário) | Nenhuma fonte pública traz; fica nos autos do PJe (descoberta de 2026-11-26) |
| Comarca no preenchimento | O Datajud só dá o código IBGE do município, não o nome |
| Partes e advogados no preenchimento | O Datajud não traz partes (virão do DJEN) |
| Perícias cíveis (TJ) | O TJ ainda recusa as consultas (pendência da `automacao-datajud`) |

---

## Assumptions & Open Questions

Confirmar com a perita antes do design (em linguagem de rotina). Códigos conferidos na TPU oficial
(`https://dpj.cnj.jus.br/sgt/api/v1.0/movimentos.csv`, baixada em 2026-11-27) e nos processos reais das fixtures.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Suspensão | Todo filho ativo de 25 "Suspensão ou Sobrestamento" (hoje só 4 deles) | A TPU agrupa ali todos os motivos de suspensão | No |
| **Correção**: 14975, 14984, 14985 | Saem da suspensão e vão para a retomada | Na TPU são filhos de 14974 "Levantamento da causa suspensiva": o processo voltou a andar | No |
| Retomada | 12066, 14974 e seus filhos, 849 "Reativação" e 893 "Desarquivamento" sugerem "Ativo" | Mesmo sentido: o processo voltou a andar | No |
| Arquivamento provisório (245) | Sugestão "Suspenso" | Na trabalhista é a execução parada à espera de bens | No |
| Hora de cobrar: quais movimentos | Trânsito em julgado (848) e início da liquidação ou da execução (11384, 11385), só se o serviço tem honorário em aberto | É quando o juiz manda pagar o perito; sem honorário em aberto não há o que cobrar | No |
| Hora de cobrar: quantas vezes | **Uma vez por serviço** | 848, 11384 e 11385 chegam em sequência; três avisos seguidos seriam ruído | No |
| Hora de cobrar: aviso ou sugestão | **Aviso** com botão para o lançamento em aberto | Não há dado a mudar: a ação é cobrar | No |
| Hora de encerrar: quais movimentos | Arquivamento definitivo (246), baixa definitiva (22) e extinção da execução (196) | Fim do processo no tribunal (visto no TRT24: pago → extinção → arquivamento) | No |
| Hora de encerrar com honorário **recebido** | Sugestão de fase "Honorários recebidos" (perícia e assistência técnica: a fase é das duas) | É a fase que encerra o serviço pelo recebimento | No |
| Hora de encerrar com honorário **em aberto** | Aviso "processo arquivado com honorário em aberto", com botão para o lançamento; não sugere encerrar | Encerrar esconderia dinheiro a receber | No |
| Pagamento seguido de arquivamento | Se há sugestão de recebimento pendente, o arquivamento **não** gera o aviso de honorário em aberto; ao aceitar o recebimento num processo arquivado, vem a sugestão de encerrar | No tribunal o pagamento vem logo antes da extinção e do arquivamento | No |
| Arquivamento muda de "só aviso" para sugestão | Esta spec substitui o padrão da `automacao-datajud` ("Arquivamento definitivo: só aviso") e o trade-off da AD-278 | Com o honorário como critério, o arquivamento diz o que fazer | No |
| Busca pelo número: quem pode usar | **Só com o módulo** Automação | É parte do premium (AD-276); sem o módulo, o botão mostra a oferta | No |
| Busca pelo número: campos | Vara, data de ajuizamento e objeto (assuntos do processo, ex. "Adicional de Insalubridade"); só os campos **vazios**, com a mesma revisão do preenchimento pelo PDF. Esfera e tribunal já saem do número, sem consulta | O Datajud não traz partes nem comarca; nunca sobrescrever o que a pessoa digitou | No |
| Busca pelo número: tribunal lento ou recusando | **A busca na hora vai falhar muitas vezes**: hoje uma consulta ao TRT16 precisou de várias tentativas e a rodada de produção, de nove. Espera até 2 min; se falhar, diz "o tribunal não respondeu agora; depois de salvar, a automação busca e traz como sugestão" | Cluster do CNJ sobrecarregado (AD-287, AD-303); a sugestão de preenchimento cobre a falha | No |
| Busca pelo número: quem consulta | A API, na hora (a chave do Datajud volta para a API, revendo o item 2 da AD-281); se o processo já foi consultado hoje, usa a cópia gravada | O worker só roda de madrugada; a resposta precisa vir na mesma tela | No |
| Preenchimento pela automação | Na primeira consulta do acompanhamento (linha de base), se o serviço tem vara, data de ajuizamento ou objeto vazios, vem a sugestão "Preencher com os dados do tribunal" | Topico 3 do usuário: também faz parte da automação | No |
| Botão da sugestão | Borda animada girando em roxo e rosa; com "reduzir movimento" do sistema, a borda fica parada | Pedido do usuário; acessibilidade | Yes (cor e forma: usuário) |
| Ruído da lista No tribunal | Esconder Decurso de Prazo, juntar Publicação + Disponibilização no Diário, agrupar expedições iguais do mesmo dia ("Alvará ×16") | Queixa original do usuário ("muitos dados desnecessários") | No |

---

## User Stories

### P1: Sugestão ao lado do dado — SGD-01

1. WHEN o serviço tem sugestão pendente de situação THEN the system SHALL mostrar, ao lado da situação no detalhe do
   serviço, o botão de sugestão (borda animada roxa e rosa) com o valor sugerido.
2. WHEN o serviço tem sugestão pendente de fase ou de preenchimento THEN the system SHALL mostrar o mesmo botão ao
   lado da fase ou dos campos que serão preenchidos.
3. WHEN o serviço tem qualquer sugestão pendente THEN the system SHALL mostrar no cabeçalho do detalhe (`CardAction`)
   o botão de sugestão com o número de pendentes.
4. WHEN a pessoa clica no botão THEN the system SHALL mostrar o que muda, de onde veio (movimento e data no tribunal)
   e os botões Aceitar e Rejeitar.
5. WHEN a pessoa sem permissão de alterar o módulo da sugestão abre o detalhe THEN the system SHALL não mostrar o
   botão (D5 da `automacao-datajud`).
6. WHEN a sugestão é aceita, rejeitada, expira ou o dado já está assim THEN the system SHALL tirar o botão do lugar
   e do cabeçalho sem recarregar a página.

### P1: Detalhe do lançamento — SGD-02

1. WHEN a pessoa abre um lançamento na lista do Financeiro THEN the system SHALL mostrar a página de detalhe: tipo,
   descrição, serviço ligado (com link), valor, parcelas e recebimentos, no padrão de detalhe do front.
2. WHEN o serviço do lançamento tem sugestão pendente de recebimento THEN the system SHALL mostrar o botão de
   sugestão ao lado da parcela em aberto e no cabeçalho, e aceitar abre o formulário de recebimento já existente
   (honorário, saldo e data do movimento para confirmar, AD-269).
3. WHEN a pessoa não vê o Financeiro THEN the system SHALL não abrir a página (permissões de `finance`).

### P1: Ações na notificação — SGD-03

1. WHEN a notificação é uma sugestão pendente THEN the system SHALL mostrar Aceitar, Rejeitar e um botão para abrir
   o dado: **Abrir serviço** (situação, fase, preenchimento) ou **Abrir lançamento** (recebimento).
2. WHEN a notificação é um aviso do tribunal (movimentação, hora de cobrar, arquivado com honorário em aberto) THEN
   the system SHALL mostrar o botão para abrir o serviço ou o lançamento em aberto.
3. WHEN o serviço tem mais de um honorário em aberto THEN the system SHALL abrir o mais antigo; sem nenhum, abrir o
   Financeiro filtrado pelo serviço.

### P1: Regras de situação pela TPU — SGD-04

1. WHEN chega um movimento filho de 25 "Suspensão ou Sobrestamento" ou o arquivamento provisório (245) THEN the
   system SHALL sugerir a situação Suspenso.
2. WHEN chega 12066, 14974 ou um filho dele (14975 a 14985, 15414, 15416), 849 "Reativação" ou 893
   "Desarquivamento" THEN the system SHALL sugerir a situação Ativo.
3. WHEN a regra muda de códigos THEN the system SHALL subir a versão da regra (as rejeições contam por versão).
4. WHEN a página Regras (`/automation/rules`) é aberta THEN the system SHALL listar as regras novas e corrigidas em
   texto da perita, a partir da mesma fonte das regras de hoje.

### P1: Hora de cobrar e hora de encerrar — SGD-05

1. WHEN chega trânsito em julgado (848) ou início da liquidação ou execução (11384, 11385), o serviço tem honorário
   em aberto e ainda não recebeu esse aviso THEN the system SHALL criar o aviso "Hora de cobrar os honorários".
2. WHEN chega arquivamento definitivo (246), baixa definitiva (22) ou extinção da execução (196) e os honorários
   estão recebidos THEN the system SHALL sugerir a fase "Honorários recebidos".
3. WHEN chega um desses movimentos, há honorário em aberto e **não** há sugestão de recebimento pendente THEN the
   system SHALL avisar "processo arquivado com honorário em aberto".
4. WHEN a pessoa aceita o recebimento de um serviço cujo processo já foi arquivado ou baixado THEN the system SHALL
   sugerir a fase "Honorários recebidos".

### P1: Buscar no tribunal pelo número, na hora — SGD-06

1. WHEN a pessoa com o módulo digita um número de processo válido de tribunal acompanhado (TRT, TRF) no cadastro ou
   na edição do serviço THEN the system SHALL habilitar o botão **Buscar no tribunal** logo depois do campo.
2. WHEN a pessoa clica THEN the system SHALL consultar o tribunal na hora e preencher os campos vazios (vara, data de
   ajuizamento, objeto), mostrando o resumo para revisar antes de salvar, como o preenchimento pelo PDF.
3. WHEN o tribunal não acha o processo ou é segredo de justiça THEN the system SHALL dizer qual dos dois e deixar o
   cadastro seguir à mão.
4. WHEN o tribunal não responde THEN the system SHALL dizer que a automação vai buscar depois de salvar e trazer como
   sugestão (SGD-07).
5. WHEN a pessoa não tem o módulo THEN the system SHALL mostrar a oferta da Automação no lugar da busca.
6. WHEN a busca dá certo THEN the system SHALL guardar a cópia do processo (a mesma do acompanhamento, AD-271), para
   a seção No tribunal aparecer logo depois de salvar.

### P1: Preencher pela automação — SGD-07

1. WHEN o acompanhamento consulta o processo pela primeira vez e o serviço tem vara, data de ajuizamento ou objeto
   vazios THEN the system SHALL criar a sugestão "Preencher com os dados do tribunal" com os valores encontrados.
2. WHEN a pessoa aceita THEN the system SHALL gravar só os campos que **continuam vazios** naquele momento.
3. WHEN os campos já foram preenchidos à mão THEN the system SHALL encerrar a sugestão sozinha.

### P2: Lista No tribunal sem ruído — SGD-08

1. WHEN a seção No tribunal lista os movimentos THEN the system SHALL esconder Decurso de Prazo, mostrar Publicação e
   Disponibilização no Diário como uma linha só e agrupar as expedições do mesmo tipo no mesmo dia ("Alvará ×16").
2. WHEN um movimento gerou sugestão ou aviso THEN the system SHALL destacá-lo na lista.

---

## Edge Cases

- Duas sugestões pendentes para o mesmo dado (ex.: suspensão e depois retomada): o botão mostra a mais recente no
  tribunal; aceitar uma encerra a outra que deixou de caber.
- A pessoa edita a situação, a fase ou os campos à mão com sugestão pendente: a sugestão que deixou de caber se
  encerra sozinha.
- Serviço sem número de processo, cível ou de tipo próprio: sem botão de busca e sem regras.
- Lançamento sem serviço: o detalhe abre, sem sugestões.
- Busca pelo número num serviço que já tem os campos preenchidos: nada é sobrescrito; o resumo diz que não havia
  campo vazio.
- Celular: o botão de sugestão cabe na linha do dado e o do cabeçalho vai para o menu de ações da página.

## Success Criteria

- [ ] A perita vê uma sugestão pendente no próprio serviço e no lançamento, sem passar pela Central.
- [ ] Da notificação ela chega ao serviço ou ao lançamento num clique.
- [ ] Um serviço novo com número de TRT sai com vara, data de ajuizamento e objeto preenchidos pelo tribunal: na hora
      ou, se o tribunal não responder, pela sugestão do dia seguinte.
- [ ] Nenhum dado muda sem Aceitar; nenhum campo digitado é sobrescrito.
