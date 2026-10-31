# Jusperia — inventário funcional

**Data**: 2026-10-31 · **Plano**: `.specs/plans/2026-10-31-benchmark-jusperia.md` · **Status**: concluído

> Engenharia reversa de comportamento, feita por navegação autenticada (conta real, plano SILVER, modo PERITO).
> Dados pessoais da conta foram anonimizados. **Evidência**: `T` = tela (URL), `F` = formulário (action + campos lidos do DOM),
> `JS` = script servido pelo app (arquivo:linha ou função), `R` = requisição de rede observada, `REA` = Evidence ID do REA.
> O que não foi observado diretamente está marcado **não confirmado**.

## Visão geral

- **Arquitetura observada**: PHP renderizado no servidor (`*.php`), formulários `POST` para `*_action.php` com redirect, alguns
  endpoints AJAX que respondem JSON (`ajax_*.php`, `api_get_*.php`). Sessão por cookie `PHPSESSID`. Sem SPA. (R: todo documento é `text/html` de `*.php`; JS: `processos.js`, `processo_detalhe.js`.)
- **Bibliotecas de front** (R): Chart.js (gráficos do dashboard), Leaflet 1.9.4 + leaflet-routing-machine (mapa), SortableJS, qrcodejs,
  TinyMCE 6.8.2 (editores de cabeçalho/rodapé/e-mail e laudo), Tom Select 2.2.2 e SweetAlert2 (módulo Laudos), Boxicons, Poppins.
- **PWA**: `manifest.json` + service worker `sw.js` e botão "Instalar App" (JS inline do layout).
- **Multi-tenant**: dados por "empresa" (`empresa_id` aparece no JSON de prazo; feed iCal tem `empresa=<id>`).
- **Dois modos de atuação ("jornada")**: PERITO (perito do juízo) e ASSISTENTE (assistente técnico). Toggle no topo
  (`?mudar_visao=PERITO|ASSISTENTE`); conta não-"Combo" recebe modal de upsell para o "Plano Combo" via WhatsApp (JS: `bloquearToggle`, `alternarVisaoCombo`).
- **Ajuda contextual**: cada tela tem playlist de vídeos de treinamento (`videos_ajuda/*.mp4`).
- **Suporte**: copiar e-mail de suporte; WhatsApp com nome, e-mail e plano pré-preenchidos.

## Menu (T: `index.php`, links da sidebar)

| Grupo | Item | Rota |
| --- | --- | --- |
| — | Comunidade | `comunidade/index.php` |
| — | Dashboard | `index.php` |
| — | Processos | `processos.php` |
| — | Minha Agenda | `agenda.php` |
| — | Mapa de Vistorias | `mapa.php` |
| — | Laudos | `Laudos/index.php` |
| — | Meus Modelos | `Laudos/lista_meus_modelos.php` |
| — | Financeiro | `financeiro.php` |
| App de Campo | App de Campo | `https://campo.jusperia.com.br` (app separado) |
| Cadastros auxiliares | Reclamante/Autor · Reclamada/Réu · Advogados/Procuradores · Locais Frequentes | `autores.php` · `reus.php` · `advogados.php` · `locais.php` |
| Administração | Clube de Benefícios · Equipe · Configurações · Diário de Bordo | `clube_beneficios.php` · `usuarios.php` · `configuracoes.php` · `auditoria.php` |
| Relatórios | Prazos · Produtividade · Processos Ociosos | `relatorio_prazos_pdf.php` · `relatorio_produtividade_pdf.php` · `relatorio_ociosos_pdf.php` |
| Suporte / Privacidade | Suporte por E-mail · Termos · Política de Privacidade · Instalar App · Encerrar Sessão | `#` · `termos.php` · `privacidade.php` · PWA · `../auth/logout.php` |

## 1. Dashboard — `index.php`

**Propósito**: painel inicial do perito com indicadores operacionais e financeiros. **Quem usa**: todos os perfis (blocos financeiros: não confirmado se somem para perfis sem financeiro).

| Bloco | Indicador | Regra observada | Clique leva a |
| --- | --- | --- | --- |
| Gestão processual e prazos | Processos ativos | contagem `status=ATIVO` | `processos.php?status=ATIVO` |
| | Laudos em rascunho | laudos com status RASCUNHO (subiu de 0 para 1 quando um laudo foi iniciado) | `Laudos/index.php` (nova aba) |
| | Prazos próximos | prazos **PENDENTE** com vencimento em até **30 dias** (05/11 contou; 04/12, a 34 dias, não) | modal `abrirModalPrazos('proximos')` |
| | Prazos vencidos | pendentes com vencimento < hoje | modal `abrirModalPrazos('vencidos')` |
| | Gráficos | "Status de elaboração" (barras: processos ativos × laudos em elaboração) e "Distribuição de prazos" (Chart.js) | — |
| Logística e vistorias | Agendadas (mês), Realizadas (mês), Atrasadas | agenda por status no mês corrente; atrasadas = `AGENDADO` com data < hoje | `agenda.php?status=…&data_inicio=…&data_fim=…` |
| | Histórico de vistorias (3 meses) | gráfico | — |
| Gestão financeira global | Recebido (mês), A receber (atraso), Despesas pagas (mês), A pagar (atraso) | por mês de recebimento/pagamento; atraso = `EM_ABERTO` com vencimento < hoje ("montante devedor histórico" desde 2000-01-01) | `financeiro_recebimentos.php?…` / `financeiro_despesas.php?…` |
| | Fluxo de caixa (6 meses) | gráfico | — |
| Listas | Próximos prazos (data, título, nº do processo) · Acessados recentemente | — | "Ver todos" → `processos.php` |

- **Personalizar**: modal de preferências do dashboard com "Restaurar padrão" (`abrirModalPreferencias`, `confirmarRestauracao`) — quais blocos mostrar (não confirmado o conteúdo exato).
- Evidência: T `index.php` (texto e `onclick` dos cards); REA `ev_c90b4f83…` (inspeção passiva da página).

## 2. Processos

### 2.1 Listagem — `processos.php`

- **Cabeçalho**: "Próximo Controle Previsto: #000N" (número de controle interno sequencial por escritório).
- **Filtros** (GET): Nº controle (texto, ex. "3"), Nº do processo (texto parcial), Vara (select populado com as varas já usadas), Cadastrado em (mês, `input month`), Status (`ATIVO`/`SUSPENSO`/`ENCERRADO`), Fase atual (as 29 fases). Botões Filtrar/Limpar.
- **Colunas**: Controle · Nº do processo · Partes (Autor × Réu) · Fase atual · Vara/Comarca · Próximo prazo · Status · Ações.
- **Próximo prazo**: menor vencimento pendente com rótulo "VENCE EM: dd/mm/aaaa" ou **"VENCE EM BREVE"** (05/11 a 5 dias apareceu como "em breve"; o limiar exato não foi confirmado) e o título do prazo; "Nenhum prazo" quando não há.
- **Ações por linha**: abrir detalhe; **Dados de campo** (`abrirModalDadosCampo` → `ajax_dados_campo.php`); **Galeria de fotos** (`abrirGaleria` → `ajax_galeria.php`: upload múltiplo com legenda, excluir imagem, vincular a um agendamento/vistoria `#selectAgendaCampo`).
- Ordenação: por controle decrescente (observado); sem exportação na listagem.
- Evidência: F `processos.php` (GET); JS `processos.js` (linhas 93, 185, 471, 608, 639).

### 2.2 Cadastro manual — `processo_novo.php` → `POST processos_action.php`

| Campo | Tipo | Obrig. | Observação |
| --- | --- | --- | --- |
| `numero_processo` | texto | sim | sem máscara nem validação de dígito verificador: CNJ com DV errado foi **aceito** (R: 302 → `processos.php`) |
| `esfera` | texto livre | não | ex. "TRT3"/"Trabalhista" (no import por IA: Trabalhista, Cível, Criminal, Federal, Previdenciária, Outro) |
| `vara`, `comarca`, `objeto` | texto | não | |
| `data_autuacao`, `data_admissao`, `data_demissao` | data | não | "Dados auxiliares para laudo" |
| `periodo_imprescrito` | texto | não | ex. "A partir de 15/05/2018" |
| `funcao_reclamante` | texto | não | |
| `data_nomeacao` | data | não | |
| `prazo_laudo` | data | não | gera prazo "Entrega do Laudo" automático (ver 2.4) |
| `status` | select | sim | `ATIVO` (Correndo prazo) / `SUSPENSO` / `ENCERRADO` |
| `fase_atual` | select (optgroups) | sim | 29 fases em 5 grupos (2.5) |
| `autor_id`, `reu_id` | select | sim | cadastro rápido por modal AJAX (2.6) |
| `advogado_autor_id`, `advogado_reu_id` | select | não | idem |
| `reu_endereco` | texto | não | "Endereço da perícia (réu) — será o local padrão na agenda" |
| `reu_latitude`, `reu_longitude` | texto | não | botão "Buscar coordenadas automáticas": geocodifica no navegador via **ArcGIS** (score ≥ 80) e cai para **Nominatim/OSM** |
| `resumo` | textarea | não | dica: usar ChatGPT/Gemini para resumir a petição |

- **Controle interno** "#0002" atribuído no momento de salvar (texto da tela: "assegurado e cravado automaticamente").
- **Duplicidade**: mesmo número no mesmo escritório é recusado com o flash *"O processo 0010847-… já está cadastrado no sistema."* (R: 302 → `processos.php`). Comparação textual exata ou normalizada: não confirmado.
- Validação só HTML5 (`required`); erros do servidor voltam como mensagem flash após redirect.

### 2.3 Detalhe e edição — `processo_detalhe.php?id=N`

- Cabeçalho: controle, número, modo; **Imprimir ficha** (`processo_exportar_ficha.php?id=`), **Checklist de campo** (`gerar_checklist_pdf.php?id=`).
- **Editar dados** (`POST processos_edit_action.php`): mesmos campos do cadastro (exceto nomeação/prazo); flash *"Dados do processo atualizados!"*.
- **Gestão de prazos** (2.4), **Resumo financeiro** do processo (honorários; link "Gerenciar financeiro" → `financeiro.php?busca=<nº>`), **Agenda & vistorias** do processo (3.x), **Exclusão** (`processo_excluir.php?id=`) com aviso: apaga agenda, laudos, prazos e arquivos; lançamentos já pagos são **desvinculados** para manter o caixa.

### 2.4 Prazos

| Ação | Endpoint | Campos |
| --- | --- | --- |
| Atualizar nomeação | `POST processos_edit_prazos_action.php` | `data_nomeacao` (+ `prazo_laudo` oculto vazio). **Não recalcula** prazos (observado). |
| Novo prazo | `POST processos_prazos_action.php` | `titulo`* (ex. "Entrega do Laudo, Resposta à Impugnação 1"), `data_vencimento`* ("vencimento fatal"), `observacoes` |
| Editar | `POST processos_prazos_edit_action.php` | título, vencimento, `status` (`PENDENTE` / `ENTREGUE` "Entregue/Protocolado" / `PERDIDO`), `data_entrega`, observações |
| Registrar entrega (baixa) | `POST processos_prazos_baixa_action.php` | `data_entrega`* → status `ENTREGUE`, exibe "Entregue em: dd/mm/aaaa" |
| Excluir | `POST processos_prazos_delete_action.php` | confirmação em modal |

- `prazo_laudo` no cadastro cria o prazo **"Entrega do Laudo"** com observação "Prazo gerado automati[camente]…" (R: JSON do prazo no `onclick`).
- Lista no detalhe ordenada por vencimento crescente. Não há cálculo de prazo em dias úteis/feriados no app; o cálculo de prazo aparece só no **prompt de importação por IA** (2.7).
- Auditoria: criação/edição de prazo entra no Diário de Bordo (§ 11).

### 2.5 Fases e automação de status

| Grupo (optgroup) | Fases | Status aplicado no cliente ao escolher |
| --- | --- | --- |
| Fase inicial | Aguardando agendam. perícia / Elaborar checklist · Aguardando aprovação laudo · Aguardando assinatura Perito no PJE · Aguardando info do local perícia · Aguardando perícia | Ativo |
| Fase de perdas | Desistência do processo · Destituição · Acordo entre as partes | **Suspenso** |
| Fase final | Aguardando laudo pericial · Revisar laudo pericial · Laudo entregue – aguardar impugnação das partes · Responder impugnação 1–4 · Aguardando retorno da impugnação 1–4 · Aguardando aprovação resposta aos esclarecimentos · Aguardando resposta dos esclarecimentos apresentados · Aguardando novos esclarecimentos · Aguardando resposta do Juiz | Ativo |
| Fase de recebimento | Prova pericial encerrada / Monitorar honorários · Honorários recebidos | **Encerrado** só para "Prova pericial encerrada"; "Honorários recebidos" não altera |
| Fase auxiliares | Retornar p/ avaliações ambientais · Retornar p/ complementar a perícia · Elaborar manifestação / petição | Ativo |

- Evidência: JS `processo_detalhe.js` (bloco "AUTOMATIZAÇÃO DE STATUS BASEADO NA FASE"); teste no DOM: Aguardando perícia→ATIVO, Acordo→SUSPENSO, Prova encerrada→ENCERRADO. Toast *"Status alterado para … automaticamente."*. A regra é **só de cliente** (o servidor aceita qualquer combinação: não confirmado).
- Fases são lista fixa (sem cadastro de fases pelo usuário: não encontrado).

### 2.6 Cadastro rápido de partes e advogados (modais no processo)

- `POST ajax_nova_parte.php` (FormData: `tipo_padrao` AUTOR|REU, `nome`*, `documento`, `telefone`, `email`) → JSON `{sucesso, id, nome, msg}` ou `{erro}`; insere e seleciona a opção no select.
- `POST ajax_novo_advogado.php` (`nome`*, `oab`, `telefone`, `email`) → mesmo contrato.
- Auditados como "CRIAÇÃO RÁPIDA … via Modal Rápido".

### 2.7 Importação — `processo_importar.php`

**Importação inteligente (IA externa, sem custo de IA para a Jusperia)**:
1. Escolher a IA (ChatGPT, Gemini, Claude, Grok ou Gemini Notebook). "Abrir IA" copia um **prompt** longo para a área de transferência e abre o site da IA; no Notebook, baixa `instruções.txt` e copia um comando curto.
2. O usuário cola o PDF/texto do processo na IA e cola de volta o **JSON** (ou envia o `dados-processo.json` do Notebook).
3. `POST processo_importar_ia.php` (`json_data`) → JSON `{sucesso,msg}`; cria processo, partes e advogados e redireciona para a listagem.
- Aviso de LGPD na tela (dados sigilosos sob responsabilidade do usuário).
- O prompt varia com a jornada (PERITO: prazo do laudo; ASSISTENTE: prazo do parecer/impugnação) e define as regras de extração: datas `YYYY-MM-DD`; telefone/documento só dígitos; OAB "UF NÚMERO"; e-mail sem `mailto:`; **data de nomeação = data de assinatura eletrônica**; **prazo do laudo calculado** somando os dias (corridos) à data de assinatura quando o despacho fala em "N dias", `null` quando depende de evento futuro; **resumo** com tipo de perícia, período, valor da causa e um bloco "CRONOGRAMA:" com todos os prazos citados; priorizar a **ata de audiência** (vara, objeto, e-mails dos advogados); **período imprescrito** trabalhista = mais recente entre (autuação − 5 anos) e admissão até a demissão; endereço do réu só se inequívoco; função do reclamante. Dicionário de sinônimos por campo. Estrutura JSON: `processo{numero_processo, esfera, vara, comarca, objeto, data_autuacao, periodo_imprescrito, data_admissao, data_demissao, data_nomeacao, prazo_laudo, resumo, funcao_reclamante}`, `autor{nome, documento, email, telefone}`, `advogado_autor{nome, oab, email, telefone}`, `reu{…, endereco}`, `advogado_reu{…}`.

**Importação em lote (CSV)**: modelo `Jusperia_template_importacao_processos.csv` (separador `;`) com colunas `numero_controle; numero_processo; esfera; vara; comarca; objeto; data_autuacao; periodo_imprescrito; data_admissao; data_demissao; data_nomeacao; prazo_laudo; resumo; autor_nome/documento/email/telefone; advogado_autor_nome/oab/email/telefone; reu_nome/documento/email/telefone; advogado_reu_nome/oab/email/telefone`. Upload `.csv` → `POST processo_importar_csv.php` → JSON; gera número de controle para todos.

- Evidência: T `processo_importar.php`; JS inline (`abrirIASelecionada`, `executarRequisicaoSalvarIA`, `processarPlanilha`); download do CSV. Importações não foram executadas (não confirmado: tratamento de duplicados e partes já existentes no import).

## 3. Agenda — `agenda.php`

- Relógio "data e hora atual"; **filtros** (GET): nº controle, nº processo, status (`AGENDADO` padrão / `REALIZADO` / `CANCELADO` / todos), data início/fim, tipo de evento.
- **Tipos de evento**: Vistoria técnica (`VISTORIA_TECNICA`), Entrevista (autor), Entrevista (réu), Reunião de peritos, Entrega de laudo, Esclarecimentos, Diligência, Outros.
- **Listagem**: data/hora · evento (tipo, processo `#controle – nº`, partes, endereço, observações) · status · ação (editar). Painéis laterais: **Atrasados**, **Urgente (7 dias)**, **Atenção (15 dias)**.
- **Criar evento** (pelo detalhe do processo, `POST agenda_action.php`): tipo*, data e hora* (`datetime-local`), local frequente (select; vazio = endereço do réu), endereço* (pré-preenchido com o endereço do réu), latitude, longitude, observações. Evento ficou `AGENDADO`.
- **Editar** (`POST agenda_edit_action.php`, com `redirecionar_para`): data/hora, status, local, endereço, lat/long, observações. **Excluir**: `agenda_delete_action.php`.
- **Sincronização**: link secreto **iCal** `feed_agenda.php?token=<token>&empresa=<id>` para assinar no Google Agenda, Outlook ou Apple Calendar (instruções na tela). Unidirecional (leitura): não confirmado se inclui prazos além dos eventos.
- A agenda **não** gera eventos automaticamente a partir de prazos (o prazo do laudo virou só prazo, não evento) — observado no processo #0002.
- Evidência: T `agenda.php`, `agenda.php?data_inicio=2026-11-01&data_fim=2026-11-30`; F `agenda_action.php`; evento criado id 521.

## 4. Mapa de vistorias e rotas — `mapa.php?data=YYYY-MM-DD`

- Lista os eventos do dia como **destinos** (tipo, processo, horário, endereço, autor, réu) com links **"Rota G.Maps"** e **"No Waze"** (coordenadas quando há, senão endereço).
- **Rota otimizada**: o usuário informa o ponto de partida (guardado em `localStorage`); o app geocodifica (BrasilAPI CEP v2 → Nominatim → ArcGIS, com fallbacks por cidade/estado) e ordena os destinos pelo **vizinho mais próximo** (distância Haversine), desenha a rota com Leaflet Routing Machine (OSRM público por padrão — não confirmado) e permite **reordenar arrastando** (SortableJS).
- **Conflito de horário**: card em vermelho quando o horário de uma parada é anterior ao da parada anterior na ordem da rota.
- **Alterar horário** pelo card: `POST agenda_update_hora_ajax.php` (JSON).
- **Aviso por e-mail**: botão gera `mailto:` para autor, réu e advogados com assunto "Aviso de Agendamento: <tipo> - Proc. <nº>" e corpo do **modelo configurável** (§ 10) com tags `[TIPO_EVENTO] [DATA] [HORA] [ENDERECO] [NUMERO_PROCESSO] [NOME_PERITO] [VARA] [COMARCA]`. O envio é pelo cliente de e-mail do usuário (não há envio pelo servidor).
- **Enviar para celular**: QR code para `/Mobile/rota.php?data=<dia>` (rota no celular).
- Evidência: T `mapa.php?data=2026-11-12`; JS inline (`calcularRotaOtimizada`, `atualizarInterfaceRota`, `renderizarCard`, `abrirModalMobile`).

## 5. Financeiro

Separado por jornada: os lançamentos pertencem ao modo atual (PERITO/ASSISTENTE); o relatório pode consolidar os dois. Quem usa: perfil "Secretaria" é descrito como "lida com financeiro/agenda" (§ 9); restrição real por perfil: não confirmado.

### 5.1 Dashboard financeiro — `financeiro.php`

- Cards do mês: **Entradas**, **Saídas**, **Saldo do mês** (observado: 1.500,00 − 231,40 = 1.268,60).
- Gráfico "Fluxo de caixa diário" (últimos 30 + próximos 30 dias).
- Listas **A receber** e **A pagar** (atrasados + próximos 30 dias).
- **Relatório** (modal → `GET financeiro_relatorio_pdf.php?contexto=PERITO|AMBOS&data_inicio&data_fim`, todos obrigatórios): PDF "Relatório de Fluxo de Caixa" com cabeçalho do escritório (nome e documento das Configurações), **saldo realizado** (entradas − saídas no período), **saldo previsto** (a receber − a pagar), tabelas de recebimentos realizados, despesas pagas, contas a receber e contas a pagar.

### 5.2 Recebimentos (honorários) — `financeiro_recebimentos.php`

- Cards gerais: **Honorários fixados**, **Recebido**, **Em atraso**; gráfico de recebimentos diários (±30 dias).
- **Filtros**: nº controle, busca (nº processo ou descrição), status (`EM_ABERTO` "não pagos" / `PENDENTE` / `PARCIAL` / `PAGO`), vencimento de/até, "teve recebimento em" (mês).
- **Colunas**: controle · vencimento · processo/descrição · valor total · já recebido · a receber · status · ações.
- **Novo lançamento** (`POST financeiro_honorario_action.php`): processo* (obrigatório — não há recebimento avulso; pedido da comunidade), descrição*, valor total fixado*, vencimento previsto*.
- **Dar baixa** (`POST financeiro_recebimento_action.php`): valor da parcela* (sugere o saldo), data em que caiu na conta*, conta de destino/observação. Parcela menor que o saldo ⇒ status **Parcial** (observado: 4.800 − 1.500 ⇒ saldo 3.300, "Parcial").
- **Histórico e estornos**: lista de parcelas; estorno por parcela (`financeiro_recebimento_delete_action.php`).
- **Editar** (`financeiro_honorario_edit_action.php`) e **Excluir lançamento completo** (`financeiro_honorario_delete_action.php?id=`).
- **Exportar relatório** (`financeiro_exportar_pdf.php` + filtros atuais): PDF "Relatório analítico financeiro" agrupado por processo (valor, parcelas recebidas, saldo) e resumo geral.
- O detalhe do processo mostra o "Resumo financeiro" (total, saldo, histórico de recebimentos) e a ficha do processo também.

### 5.3 Despesas — `financeiro_despesas.php`

- Cards: **A pagar**, **Em atraso**, **Já pago**; gráfico de despesas diárias.
- **Filtros**: busca, status, **categoria**, vencimento de/até, "paga em (mês)".
- **Categorias** (lista fixa): Serviços terceiros/parceiros · Combustível/deslocamento · Alimentação · Hospedagem · Software/sistemas · Impostos/taxas · Material de escritório · Outros.
- **Nova despesa** (`POST financeiro_despesa_action.php`): processo (opcional; vazio = "custo geral do escritório"), descrição*, categoria*, valor*, vencimento*, **"já foi pago total hoje"** (registra o pagamento com a **data de hoje**, não a do vencimento — observado no relatório), observações. Status exibido "Quitado".
- **Pagar** (parcial ou total, `financeiro_despesa_pagar_action.php`: valor desembolsado*, data*, conta de origem), **histórico e estorno** por pagamento (`financeiro_despesa_estorno_action.php`), editar, excluir.

## 6. Relatórios (PDF gerados no servidor)

| Relatório | Rota | Conteúdo observado |
| --- | --- | --- |
| Cronograma de prazos | `relatorio_prazos_pdf.php` | prazos **pendentes** de processos ativos: processo/vara, evento/objeto, prazo limite e alerta **"URGENTE: FALTAM N DIAS"** (5 dias) ou "FALTAM: N DIAS" (34 dias) |
| Produtividade de campo | `relatorio_produtividade_pdf.php` | ano base: total de visitas, realizadas, canceladas/ausentes, evidências/fotos e média por evento, por mês, com gráfico |
| Processos ociosos | `relatorio_ociosos_pdf.php` | processos ativos **sem movimentação há mais de 60 dias**: total e maior tempo de inatividade ("Excelente gestão!" quando zero) |
| Fluxo de caixa | `financeiro_relatorio_pdf.php` | § 5.1 |
| Analítico financeiro | `financeiro_exportar_pdf.php` | § 5.2 |
| Ficha analítica do processo | `processo_exportar_ficha.php?id=` | dados, partes e advogados, resumo, prazos com status, agenda, resumo financeiro (fixado/recebido/saldo) |
| Checklist de campo pré-perícia | `gerar_checklist_pdf.php?id=` | cabeçalho do processo; participantes com assinatura; mapeamento de riscos (ruído, calor/frio/umidade, químicos anexos 11–13, biológicos anexo 14, periculosidade) com Sim/Não e EPI; matriz de divergências (versão reclamante × reclamada × constatação); documentos solicitados; anotações |

Todos os PDFs indicam o modo (PERITO/ASSISTENTE) e "Gerado em". Os três relatórios do menu não têm filtro de entrada (o que caracteriza "movimentação" no relatório de ociosos: não confirmado).

## 7. Laudos — `Laudos/index.php`

### 7.1 Lista

- Filtros: nº controle e processo vinculado (Tom Select com busca). Colunas: documento · controle · processo · última atualização · status · ações (mudar status, abrir editor, excluir).
- **Status**: `RASCUNHO` ↔ `CONCLUIDO`. Concluir pede confirmação e oferece **atualizar a fase do processo** junto (`POST alterar_status_laudo.php`: `id`, `status`, `atualizar_processo`, `nova_fase` → `{"sucesso":true}`); observado: fase do #0002 foi para "Laudo entregue – aguardar impugnação das Partes". Laudo concluído **não** abre no editor ("altere o status de volta para Rascunho"). Concluir o laudo **não** baixa o prazo "Entrega do Laudo".
- Dashboard: "Laudos em rascunho" conta os rascunhos.

### 7.2 Criação em 3 passos

1. Modal "Laudos": processo* + modelo estrutural* (`[LAUDO] Padrão Jusperia - Laudo Completo` ou modelos próprios) → `POST preparar_laudo.php`.
2. **"O que deve constar no laudo?"**: resumo do processo (autor, réu, vara/comarca, objeto, autuação, prazo) e a árvore de seções do modelo (88 itens no padrão) com **checkbox** e, por seção, **variante "Sim (positivo/existente)" / "Não (negativo/inexistente)"** que escolhe o texto-base; seções "apenas título" agrupam. → `POST iniciar_laudo.php` (`blocos_selecionados[]`, `opcao_bloco[n]`) → 302 `editor_laudo.php?laudo_id=&processo_id=`.
   - Seções do padrão: capa; objeto; considerações preliminares; introdução (amparo legal, insalubridade NR-15, periculosidade NR-16, ergonomia NR-17, acidente/NR-1, PPP, hierarquia de controle); preliminares (dados do processo, ata, prova pericial, comunicação); vistorias (local e data, presentes, período/função/atividades); locais de trabalho; medidas de proteção; documentação de segurança; **avaliação de insalubridade por anexo da NR-15 (1 a 14)**; **periculosidade por anexo da NR-16 (1 a 6 + radiações)**; acidente de trabalho (8 subseções); ergonomia (AET); meio ambiente de trabalho; PPP (LTCAT/PGR); respostas aos quesitos (reclamante, 1ª e 2ª reclamada, juízo); conclusão; honorários; considerações finais; encerramento; anexos I–IV (agendamento, avaliações ambientais, certificados de calibração, referências).
3. **Editor** (`editor_laudo.php`): TinyMCE por seção, numeração recalculada ao remover seção, por seção **"IA"** (`POST melhorar_texto.php`: `texto_original` ofuscado + `laudo_id` → `{sucesso, texto_melhorado}`; ~41 s; mostra comparação para aceitar), **"Inserir variável"**, **"Remover seção deste laudo"**.
   - **Variáveis** (substituídas automaticamente nos blocos): `[OBJETO_PERICIA] [PERIODO_IMPRESCRITO] [NOME_AUTOR] [NOME_REU] [NUMERO_PROCESSO] [VARA] [COMARCA] [ESFERA] [DATA_AUTUACAO] [DATA_ADMISSAO] [DATA_DEMISSAO] [PERITO_NOME] [PERITO_DOCUMENTO] [PERITO_REGISTRO] [DATA_EXTENSO] [LOCAL_VISTORIA] [DATA_VISTORIA] [HORA_VISTORIA]` e as vindas do **app de campo** da vistoria selecionada: paradigmas do reclamante/reclamada (nome, função, quando, trabalhou junto — até 2 cada) e histórico ocupacional (até 4 funções: título, ano início/fim, local, o que fazia, tempo de exposição, frequência — versão reclamante × reclamada).
   - Painel **"Evidências de campo (vistoria)"**: rascunho interno que não sai na impressão, **"Puxar obs do app"**, galeria de fotos da vistoria (upload via `../ajax_galeria.php`) e inserção de imagem com legenda no texto.
   - **Revisar ortografia** (liga o corretor do navegador). **Salvar rascunho** / **Gerar/visualizar**: `POST salvar_parte.php` `tipo=geral` (evidências) + um `tipo=bloco` por seção (`id_secao`, `codigo`, `titulo`, `conteudo` base64 invertido) + `tipo=sincronizar` (`ids_mantidos`) → `visualizar.php?id=`.
   - Defeito observado no modelo padrão: a capa saiu "EXMO. SR. JUIZ DA 2ª Vara do Trabalho de Uberaba ª VARA DO TRABALHO DE Uberaba - MG" (variável concatenada a texto fixo) e "XXXXXXXX, 31 de outubro de 2026".
4. **Visualizar** (`visualizar.php?id=`): capa, sumário com âncoras, seções; **Baixar PDF** (`laudo_exportar_pdf.php`, 15 páginas, nome `<nº>_<modelo>.pdf`) e **Baixar Word** (`laudo_exportar_word.php`, `.doc` que é HTML com `application/vnd.ms-word`).
- Auditoria: criação ("Status inicial: RASCUNHO"), edição de rascunho e visualização entram no Diário de Bordo.

### 7.3 Meus modelos — `Laudos/lista_meus_modelos.php`

- **Novo modelo**: nome*, descrição, tipo (`LAUDO`; no modo assistente provavelmente parecer — não confirmado) e forma de criação: **Clonar padrão** / **Em branco** (`POST criar_modelo_perito.php` → `{sucesso, modelo_id}`) ou **Gerar com IA** (`gerar_modelo_ia.php`: tema*, esfera, foco técnico*, observações livres → `POST processar_modelo_ia.php` gera a estrutura → `POST salvar_modelo_ia.php` com `blocos` JSON).
  - Observado: a geração por IA **falhou** com `{"sucesso":false,"erro":"Falha na IA (HTTP 401): API key not valid…"}` (chave do provedor inválida no concorrente). A IA de "melhorar texto" funcionou no mesmo dia.
- **Editor de modelo** (`editar_modelo_perito.php?id=`): tabela de seções (código, título, ordem numérica, "apenas título", quebra de página) e, por seção, **texto padrão "Sim"** e **texto secundário "Não"** (TinyMCE com IA e variáveis; a lista de variáveis mostra exemplos de valor). Salvar (`salvar_bloco_perito.php`), excluir seção (`excluir_bloco_perito.php`), nova seção.

## 8. Cadastros auxiliares

| Cadastro | Rota | Campos | Ações |
| --- | --- | --- | --- |
| Reclamante/Autor | `autores.php` | nome/razão social*, CPF/CNPJ ("apenas números ou formatado", sem validação observada), e-mail, telefone/WhatsApp | novo, editar, **ver processos** (`api_get_processos.php?tipo=autor&id=`), busca local |
| Reclamada/Réu | `reus.php` | idem (`tipo_padrao=REU`) | idem |
| Advogados/Procuradores | `advogados.php` | nome*, OAB (ex. "SP 123456"), e-mail, telefone | idem (`tipo=advogado`) |
| Locais frequentes | `locais.php` | nome do local*, endereço completo* ("aparece no laudo/e-mail"), latitude*, longitude* | novo, editar, excluir; usados como local de evento na agenda |

- Partes e advogados **não têm exclusão** na interface. Partes são uma tabela única com `tipo_padrao` (AUTOR/REU) — export `partes.csv`.

## 9. Equipe — `usuarios.php`

- Colunas: nome, e-mail, cargo (sistema), atuação (jornada), status.
- **Novo membro** (`POST usuarios_action.php`): nome*, e-mail de acesso*, senha*, **perfil de acesso** (`ASSISTENTE` "Equipe técnica — lida com laudos/processos" / `SECRETARIA` "lida com financeiro/agenda"; o titular é `PERITO_TITULAR` "Administrador"), **tipo de atuação** (`PERITO` fluxo completo / `ASSISTENTE` "fluxo reativo/pareceres"), CPF ("para laudos/alvará"), registro profissional (CREA/MTE), formação, status ativo/inativo. Editar com senha opcional.
- O que cada perfil vê/pode: **não confirmado** (não foi criado usuário para não gerar acesso na conta).

## 10. Configurações — `configuracoes.php`

- **Assinatura**: plano (SILVER), vencimento com dias restantes, "Renovar" (ainda "Em breve: PIX/boleto/cartão").
- **Privacidade e dados**: "Baixar meus dados (.ZIP)" (`exportar_dados_action.php`) → `meus_dados_jusperia_<data>.zip` com `empresas, usuarios, advogados, agenda, financeiro_honorarios, financeiro_recebimentos, partes, processos` em CSV (`;`, UTF-8 com BOM). **Não inclui despesas** nem laudos (laudos avisados na tela).
- **Dados gerais e identidade visual** (`POST configuracoes_action.php`): nome do escritório*, CPF/CNPJ, telefone, **número de controle inicial** (sequência dos processos), **logotipo** (JPG/PNG, normalizado para 100 px de altura), **cabeçalho padrão** (TinyMCE, tags `[LOGO] [NOME_PERITO]`) e **rodapé padrão** (`[PAGINA_ATUAL] [TOTAL_PAGINAS]`) dos relatórios e laudos.
- **Modelo de aviso por e-mail** (`salvar_modelo_email.php`, "Restaurar padrão"): corpo do e-mail de agendamento (§ 4) com tags `[TIPO_EVENTO] [DATA] [HORA] [ENDERECO] [NUMERO_PROCESSO] [NOME_PERITO] [VARA] [COMARCA]`. O padrão é uma petição ao juízo comunicando data/hora/local da diligência, regras de comparecimento (antecedência de 10 min), início independente da presença e art. 400 do CPC.

## 11. Diário de bordo (auditoria) — `auditoria.php`

- Filtros: período, usuário, módulo (Agenda, Agenda e Vistorias, Cadastros Auxiliares, Financeiro, Financeiro (Honorários), Financeiro (Recebimentos), Laudos, Prazos, Processos, Autenticação), busca na descrição. Colunas: data/hora, usuário, módulo, ação, descrição detalhada.
- **Ações auditadas observadas**: criação/edição/baixa de prazo; criação rápida de parte/advogado; edição de processo e de nomeação; criação de evento; registro mobile de evidências e mudança de status mobile; criação de honorário, recebimento e despesa; laudo criado/editado/visualizado/exportado (PDF/Word)/mudança de status; login.
- **Não auditado** (observado): **criação de processo** (#0002 não aparece), prazo automático do laudo, criação de modelo.

## 12. Campo

### 12.1 Rota de campo no celular — `Mobile/rota.php?data=`

Aberta pelo QR do mapa. Mostra relógio, aviso "rota futura", e por evento: horário, status, tipo, endereço, observação, Waze/G. Maps, nº do processo e:
- **Status rápido**: Feita (`REALIZADO`), Adiada (`CANCELADO`), Ausente (`CANCELADO`) — `POST rota.php acao=atualizar_status` → `{sucesso,msg}`.
- **Formulário de vistoria** em abas: *Participantes* (paradigmas do reclamante e da reclamada: nome, função, trabalhou junto, quando), *Funções* (título, ano início/fim) e *Atividades* por função (o que fazia, frequência, tempo, local — versão do reclamante × da reclamada).
- **Fotografias** (máx. 10): câmera, compressão para 1600 px no navegador com carimbo de texto (endereço e horário — inferido de `compressImage(file, endereco, instante)`), legenda por foto.
- **Offline-first**: rascunho em **IndexedDB**, "Salvar rascunho local", mescla do rascunho local com o do servidor; envio `POST rota.php acao=salvar_evidencia` (`observacao`, `dados_vistoria` JSON, `fotos[]`, `legendas[]`, `foto_ids[]`) → `{sucesso, msg:"Registos e fotografias sincronizados!", fotos_resultados, fotos_falhas}`.
- O export `agenda.csv` tem coluna **"Audio Campo"** (gravação de áudio em campo: não observada na tela).
- **Defeito observado**: o formulário grava `participantes.testemunhas_reclamante/reclamada`, mas o editor de laudo lê `Paradigmas_reclamante/reclamada`; após enviar paradigmas, as variáveis `[PARADIGMA_*]` ficaram vazias e as de função (`[FUNCAO_1_TITULO]` = "Soldador MIG/MAG", `[FUNCAO_1_TEMPO_RTE]` = "8h por dia") foram preenchidas.

### 12.2 App de Campo — `https://campo.jusperia.com.br`

App separado com login próprio (e-mail e senha do perito; "conecte-se com internet para autenticar"). **Não acessado** (sem credencial; não se contornou o login). Supõe-se que seja a mesma rota de campo como app instalável — não confirmado.

### 12.3 Na listagem de processos

- **Dados de campo** (`ajax_dados_campo.php`: `listar_agendas`, `buscar_dados`): escolhe o evento do processo e mostra o formulário de vistoria preenchido.
- **Galeria** (`ajax_galeria.php`: `listar`, upload com legenda, excluir, vincular a evento).

## 13. Comunidade e clube

- **Comunidade** (`comunidade/`): fórum entre assinantes com categorias (Suporte técnico, Dúvidas de perícia, Networking, Sugestões de melhoria), busca, tópicos com autor, jornada (PERITO/AMBOS), respostas e visualizações; novo tópico (título*, categoria*, conteúdo*). Nenhum tópico foi criado. Sugestões públicas observadas: variável para "anotações gerais", recebimento sem vínculo a processo, importar todos os prazos do calendário pericial.
- **Clube de benefícios**: parceiros de SST/higiene ocupacional com desconto; resgate por link de WhatsApp ou formulário.

## 14. Modo Assistente técnico (jornada ASSISTENTE)

Não acessível na conta (plano exclusivo PERITO; o toggle abre upsell do "Plano Combo"). Indícios: o prompt de importação muda o "prazo do laudo" para prazo do parecer/impugnação; o export de processos tem a coluna **"Contratante"**; o relatório financeiro tem visão "Ambos"; a equipe tem jornada "Assistente técnico (fluxo reativo/pareceres)". Tudo **não confirmado**.

## 15. Integrações observadas

| Integração | Como | Evidência |
| --- | --- | --- |
| Geocodificação | ArcGIS World Geocoder, Nominatim (OSM), BrasilAPI CEP v2 — chamadas **do navegador** | JS `processo_detalhe.js`, inline de `mapa.php` |
| Mapa e rotas | Leaflet + leaflet-routing-machine (OSRM), Google Maps e Waze por deep link | R `mapa.php` |
| Calendário | feed **iCal** por token (`feed_agenda.php?token&empresa`) para Google/Outlook/Apple | T `agenda.php` (modal sincronizar) |
| E-mail | `mailto:` montado no cliente (sem envio pelo servidor) | JS inline de `mapa.php` |
| IA | servidor: melhorar texto (funcionando) e gerar modelo (falhando com 401 — mensagem no formato da API Gemini, inferência); importação de processo usa IA **externa** colada pelo usuário | R `melhorar_texto.php`, `processar_modelo_ia.php` |
| WhatsApp | suporte, upsell e clube via `wa.me` | links |
| Tribunais / PJe / **Datajud** | **nenhuma integração observada**: não há consulta automática de processo, movimentações ou prospecção. "PJe" só aparece como nome de fase | busca em todas as telas e JS |

## 16. Notificações, alertas e automações

- Sem notificação ativa observada (nenhum e-mail, push ou WhatsApp enviado pelo sistema); os alertas são visuais: dashboard (prazos próximos 30 dias/vencidos, vistorias atrasadas, financeiro em atraso), agenda (atrasados / urgente 7 dias / atenção 15 dias), listagem ("vence em breve"), relatório de prazos ("URGENTE: faltam N dias"), relatório de ociosos (> 60 dias).
- Automações: `prazo_laudo` ⇒ prazo "Entrega do Laudo"; fase ⇒ status (cliente); concluir laudo ⇒ opção de mudar a fase; endereço do réu ⇒ local padrão da vistoria; dados de vistoria ⇒ variáveis do laudo; controle sequencial por escritório.

## Log de registros criados na conta (2026-10-31)

| Registro | Identificação | Como |
| --- | --- | --- |
| Autor | Rogério Albuquerque Mendes (id não exibido) | modal rápido (cenário REA, parcialmente executado) |
| Réu | Metalúrgica Vale do Paranaíba Ltda | idem |
| Advogada | Luciana Ferreira Bastos (OAB MG 128455) | idem |
| Processo | #0002 · 0010847-62.2025.5.03.0168 (id 630) | cadastro manual; criado com DV errado e corrigido na edição; duas tentativas de duplicidade recusadas |
| Prazos | "Entrega do Laudo" (id 567, automático) · "Apresentação de quesitos suplementares" (id 568, baixado) | |
| Evento | Vistoria técnica 12/11/2026 09:00 (id 521), depois marcado REALIZADO com dados de vistoria | |
| Honorário | id 82, R$ 4.800,00, recebimento parcial id 40 de R$ 1.500,00 | |
| Despesa | Combustível R$ 231,40, paga | |
| Laudo | id 174, concluído (mudou a fase do #0002) | |
| Modelo | id 117 "Laudo Insalubridade – Ruído e Calor" (clonado) | |

Nada foi removido até aqui. Registros pré-existentes da conta (processo #0001 e seus dados) não foram alterados; durante a sessão houve atividade simultânea de outra pessoa nele (edição de prazo e criação de laudo às 00:28–00:33).

## Perguntas abertas

1. Permissões reais dos perfis `ASSISTENTE` e `SECRETARIA` (exige criar um usuário na conta).
2. Modo Assistente técnico: telas e campos ("Contratante", parecer, impugnação) — exige plano Combo.
3. App de Campo `campo.jusperia.com.br`: é o mesmo `Mobile/rota.php` empacotado? Tem gravação de áudio?
4. Conteúdo do feed iCal (só eventos ou também prazos?) e se é atualizado em tempo real.
5. Limiar exato de "vence em breve" na listagem e o que conta como "movimentação" no relatório de ociosos.
6. Importação por IA/CSV: tratamento de duplicados e de partes já cadastradas (não executada).




## Respostas do usuário às perguntas abertas (2026-10-31)

Definem o comportamento desejado **para o Ethica** (não são observação da Jusperia).

1. **Perfis e permissões**: os perfis de equipe (equivalentes a "Equipe técnica" e "Secretaria") passam sempre por uma etapa de seleção de permissões por módulo e por ação (acessar, visualizar, editar, inserir, excluir). Cada perfil vem com valores pré-selecionados diferentes. O primeiro acesso do escritório vira administrador e gerencia as permissões desses perfis.
2. **Assistente técnico**: atua de forma parcial, em defesa de uma das partes, com base em normas técnicas; acompanha a perícia para apontar falhas na metodologia do perito e faz a intermediação técnica entre a parte e o perito. No sistema o fluxo é quase o mesmo do perito do juízo, mas emite **parecer técnico** em vez de laudo; pode fazer medições de agentes quantitativos junto com as do perito, apresentar quesitos complementares e suplementares e impugnar o laudo. Os honorários do assistente são pagos por quem o contratou (advogado ou a própria parte, reclamante ou reclamada). Na perícia cível as partes se chamam autor e réu; a lógica e os entregáveis são os mesmos.
3. **App de campo**: usa o mesmo BFF; grava áudio e permite transcrevê-lo depois, se o usuário quiser; salva localmente a edição e o preenchimento dos formulários; contém os laudos e funciona como **pré-laudo**, recebendo fotos, as versões das partes ouvidas pelo profissional, nome, e-mail e assinatura das partes, documentos disponíveis e outros.
4. **Feed iCal**: explicado ao usuário (URL `.ics` assinada uma vez no calendário do celular, só leitura, atualizada periodicamente pelo app de calendário).
5. **"Vence em breve"**: 15 dias. **Movimentação** (relatório de ociosos): carregamento do laudo, notificação de recebimento de honorários, intimação para prestar esclarecimentos e para laudo complementar.
6. **Duplicados na importação**: pula o processo já cadastrado, apenas com um aviso.
