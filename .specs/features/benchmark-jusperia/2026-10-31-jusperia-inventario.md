# Jusperia — inventário funcional

**Data**: 2026-10-31 · **Plano**: `.specs/plans/2026-10-31-benchmark-jusperia.md` · **Status**: em andamento (navegação passiva concluída; fluxos com escrita pendentes)

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

<!-- PRÓXIMAS SEÇÕES: financeiro, laudos, modelos, cadastros, equipe, configurações, diário de bordo, relatórios, app de campo, comunidade, clube -->

