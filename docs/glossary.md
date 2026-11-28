# Glossário

Termos de domínio usados no código, na interface e nos documentos. A coluna **Código** é o nome único do termo em todas as camadas (AD-140): termo novo entra aqui antes de ir para o código. Valores de enum vivem no código (`packages/contracts/src/schemas/`) — aqui só o significado.

| Termo | Código | Significado |
| --- | --- | --- |
| Serviço (antes "Perícia" na tela) | `Case` (`case` module) | Um trabalho do perito: processo judicial em que atua como perito ou assistente técnico, ou serviço de tipo criado pelo escritório (AD-158). O processo judicial é identificado pelo número CNJ, único por tenant; o serviço do escritório pode não ter número. |
| Tipo de serviço | `serviceType` do `Case` (`SERVICE_TYPES`) | Perícia (`expert_examination`), Assistência técnica (`technical_assistance`), Parceria (`partnership`) ou Serviço particular (`private_service`) (AD-310). Só a perícia tem esfera (`courtType`). |
| Fase do serviço | `phase` do `Case` (`CASE_PHASES`; a lista de cada tipo em `casePhases`) | Perícia em grupos (`CASE_PHASE_GROUPS`), assistência com lista própria e Parceria/Serviço particular com `OWN_SERVICE_PHASES`; Finalizado (`finished`) é a última de todos os tipos e encerra o serviço (AD-310). |
| Status do serviço | `status` do `Case` (`CASE_STATUS`) | Ativo, Suspenso ou Cancelado (AD-178). Encerrado = cancelado ou fase que encerra (`CASE_CLOSED_PHASES`, AD-306). |
| Situação do serviço | `situation` da listagem (`CASE_SITUATIONS`) | Em andamento (`open`) ou Finalizado (`closed`, encerrado pela regra acima); filtro da lista de Serviços (AD-308). |
| Honorário líquido | — (calculado na tela) | Honorário fixado ou contratado (sem ele, o proposto) menos as despesas não canceladas do serviço (AD-159). |
| Número do processo (CNJ) | `processNumber` | Formato `NNNNNNN-DD.AAAA.J.TR.OOOO` (Resolução CNJ 65/2008). |
| Justiça | `courtType` | Trabalhista, cível ou federal (`labor`, `civil`, `federal`); só na perícia (AD-178). |
| Atuação | `role` | Perito do juízo (`court_expert`) ou assistente técnico de uma das partes (`technical_assistant`). |
| Parte | `Party` (`case`), `parties` da perícia | Cadastro reutilizável de parte (`party`, com CPF/CNPJ) ou advogado (`lawyer`, com OAB), ambos com CREA opcional; um cadastro por nome (`nameKey`, AD-164). Na perícia fica ligada a um **polo**: autor/reclamante (`plaintiff`) ou réu/reclamada (`defendant`) (AD-117); o advogado é da parte que vem antes dele no mesmo polo. |
| Período imprescrito | `nonPrescribedPeriodStart`/`End` | Parte do contrato de trabalho que ainda pode ser cobrada: do mais recente entre (autuação − 5 anos) e a admissão até a demissão (AD-115). |
| Movimentação | `Case.movements` | Fato do processo com data (entrega do laudo, notificação de honorários, intimação para esclarecimentos ou laudo complementar) que reinicia a contagem de perícia parada (AD-121). |
| Perícia parada | `GET /documents/stalled` | Perícia não encerrada sem movimentação há mais de 60 dias (AD-121). |
| Importação | `POST /expert-cases/import/{pdf,csv}` | PDF da ata/despacho preenche o cadastro para revisão; CSV cria as perícias em lote com relatório por linha (AD-114, AD-118). |
| Vara (contato) | `CourtDivision` (`case`); na perícia, `division` | Vara do trabalho, cível ou federal na agenda de contatos do escritório (telefones, e-mail, balcão virtual), por UF e cidade (AD-151). |
| Mensagem de contato | `ContactMessage` (`contact` module), `POST /contact` | Mensagem que um visitante envia pela página Contato; vai por e-mail ao endereço do Ethica (`CONTACT_EMAIL`) e não é guardada (AD-249). |
| Nomeação | `nominationDate` | Dia em que o juízo nomeou o perito. |
| Prazo do laudo | `reportDueDate` (só no cadastro e na importação) | Dia limite de entrega; vira o prazo "Entrega do laudo" do serviço (AD-264). |
| Notificação | `Notification` (`notifications`) | Tudo o que pede a atenção de alguém no escritório (AD-263), de quatro tipos (`kind`): **prazo** (`deadline`), **alerta** (`alert`), **sugestão** (`suggestion`) e **aviso** (`notice`). Lido é por pessoa (`readBy`). Toda notificação está **aberta** (pede alguém) ou **resolvida** (alguém agiu) e tem uma data (AD-282). |
| Prazo | `kind: 'deadline'` da `Notification` | Prazo processual do serviço (laudo, esclarecimentos, impugnação…): pendente, protocolado (com a data de protocolo), perdido ou cancelado. **Vence em breve** = até 15 dias. |
| Alerta | `kind: 'alert'` da `Notification` | Lembrete com data que se conclui ou cancela (AD-189). |
| Sugestão | `kind: 'suggestion'` da `Notification` | Alteração proposta pela Automação Datajud que só vale quando uma pessoa aprova (AD-268): pendente, aceita, rejeitada, superada ou expirada. |
| Aviso | `kind: 'notice'` da `Notification` | Informação sem ação (movimentação no tribunal, vencimento financeiro, pagamento em andamento); o texto é uma chave de tradução (`topic`). |
| Processo no tribunal | `CourtProcess` (worker, global) | Cópia pública do processo no Datajud, igual para todo escritório (AD-271); nunca processo sigiloso nem partes. |
| Movimentação do tribunal | `courtMovement` (`CourtProcess.movements`) | Movimento do processo no Datajud (código TPU, nome, data e complementos); não se confunde com a movimentação do serviço (`movement`). |
| Acompanhamento do serviço no tribunal | `CaseCourtSync` | Linha de base por serviço: os movimentos já vistos, para só o novo virar aviso. Sem `baselineAt`, o processo foi consultado e não encontrado no tribunal. |
| Fila do worker | `WorkerJob` | Tarefa de fundo do `apps/worker`, com prioridade, retry e trava por janela (AD-267). |
| Entrega de notificação | `NotificationDelivery` | Trava de envio por pessoa, canal e chave (consolidado do dia ou imediato), contra envio em dobro. |
| Honorários propostos | `proposedFeesCents` | Proposta do perito. |
| Honorários fixados | `fixedFeesCents` | Valor fixado pelo juízo; vira receita a receber no financeiro. |
| Compromisso | `Appointment` (`agenda`) | Item da agenda com horário: vistoria, inspeção, avaliação, perícia, audiência, reunião ou outro (`APPOINTMENT_TYPES`, AD-302). A data da perícia do serviço vira o compromisso de perícia automático (AD-169). |
| Item da agenda | `CalendarEntry` (`agenda`) | Item de dia inteiro enviado por outro módulo (AD-169): prazo, honorário a receber, despesa ou recebimento, aberto, feito (protocolado/pago), perdido ou cancelado. |
| Inspeção | `type: 'technical_inspection'` no `Appointment` | Compromisso de inspeção técnica, classificado à parte da vistoria (AD-302). |
| Avaliação | `type: 'appraisal'` no `Appointment` | Compromisso de avaliação (ex.: de imóvel ou bem), classificado à parte (AD-302). |
| Perícia (compromisso) | `type: 'expert_examination'` no `Appointment` | Compromisso que a perita marca como perícia; o compromisso automático da data da perícia do serviço segue como vistoria (AD-169, AD-302). |
| Vistoria | `type: 'inspection'` no `Appointment`; registro `Inspection` (`agenda`) | Visita técnica ao local periciado. O registro colhido em campo (presentes, paradigmas, funções, agentes, mídias) é um `Inspection` por compromisso (AD-130). |
| Lançamento | `Transaction` (`finance`) | Receita (honorário prévio ou fixado) ou despesa operacional (deslocamento, material, taxas, outras). |
| Parcela (recebimento) | `installments` do lançamento de receita | Valor que caiu na conta contra um honorário, com data e conta; estornável. Honorário não é excluído nem cancelado (AD-111). |
| Meta do ano | `revenueGoals` do `Tenant` (`identity`), uma por ano; acompanhamento em `GET /finance/revenue-goal?year=` | Quanto o escritório quer receber em um ano. O realizado é a soma das parcelas recebidas naquele ano, pela data de cada recebimento (AD-258, AD-259). |
| Previsto / parcial / liquidado / cancelado | `status` do lançamento (`expected`, `partial`, `settled`, `canceled`) | A receber/pagar, recebido em parte (só receita), já recebido/pago, desconsiderado (só despesa). No honorário, vem das parcelas. **Atrasado** é derivado: previsto ou parcial com vencimento antes de hoje. |
| Feed iCal | `GET /agenda/feed/:token.ics` | Link secreto, só leitura, para assinar compromissos e prazos no Google/Outlook/Apple. |
| Tour guiado | `GuidedTour` (`apps/web`), preferência `onboardingDismissed` | Sequência curta de balões no primeiro acesso que apresenta as seções do menu conforme as permissões da pessoa; reaberto por "Ver tour" no menu do usuário (AD-233). |
| Datajud | `providers/datajudClient.ts` | API Pública do CNJ com metadados e movimentos dos processos dos tribunais. |
| Laudo / parecer técnico | `Report` (`documents`), `type` `report`/`technical_opinion` | Documento técnico redigido por seções a partir de um modelo, com variáveis da perícia (AD-126). |
| Modelo de laudo | `Template` (`documents`) | Seções sim/não reutilizáveis; os padrões vêm do código e são só leitura (AD-126), um ou mais por tipo (AD-163). |
| Área de atuação (do modelo) | `Template.area` | Tipo de serviço a que o modelo serve: esfera da perícia, assistência técnica ou tipo próprio (AD-204). |
| Responsável técnico | `Signatory` (`documents`); no laudo, `Report.Signatory` | Quem assina o laudo quando não é a dona da conta: dados, logo, cabeçalho e rodapé próprios, sem acesso ao Ethica (AD-162). |
| OS (ordem de serviço) | `Case.serviceOrder`; sequência `ServiceOrderSequence` (`case`) | Número de controle do serviço, `SIGLA-AAAA-NNN`, dado pela sequência do escritório no cadastro (AD-161). |
| Anexo | `Case.attachments` (`case`) | Arquivo guardado no serviço, na cota do escritório (AD-197). |
| Link da pasta | `Case.folderUrl` | Endereço da pasta do serviço no OneDrive, Google Drive, Dropbox ou outro (AD-197). |
| Faz parte do laudo | `sections[].included` | Item que sai no PDF e no Word; desmarcado fica no rascunho com o texto (AD-163). |
| Layout do laudo | `layout` (`reportLayoutSchema`) | Fonte, tamanho, espaçamento, margens, cor dos títulos e páginas (capa, sumário, abertura) do laudo (AD-163). |
| Histórico de auditoria (antes "Diário de bordo") | `Activity` (`identity`) | Registro de quem fez o quê: toda escrita, exportação e entrada no sistema, guardado por 1 ano (AD-134). |
| Valor de domínio | enums em `packages/contracts/src/schemas/` | Gravado e devolvido pela API em inglês (AD-113); o web traduz com `t()` antes de mostrar. |
| Chave de acesso | `AccessKey` (`identity`) | Link de uso único e código de 6 dígitos enviados ao e-mail da pessoa para entrar ou criar o escritório; vale 15 minutos. Não há senha (AD-155). |
| Acesso do aparelho (passkey) | `Passkey` (`identity`) | Chave guardada no próprio aparelho (digital, rosto, PIN ou Windows Hello) que abre toda sessão; no máximo um computador e um celular por pessoa (AD-220). |
| Tenant | `Tenant` | O escritório/perito cliente da plataforma; todo dado é isolado por tenant. |
| Assinatura | `Tenant.billing` (`identity`, rotas `/billing`) | Pagamento do escritório ao Ethica no Asaas: assinatura no cartão ou mensalidade avulsa (AD-230). |
| Acesso pago | `Tenant.accessUntil` | Até quando o escritório usa o Ethica; cada pagamento confirmado estende. Sem a data, sem controle (AD-230). |
| Plano | `plan` (`BILLING_PLANS`) | Teste, mensal, anual ou mensalidade avulsa, escolhido em "Pagar" (AD-230). |
| Fatura | `invoiceUrl` (Asaas) | Página de pagamento hospedada pelo Asaas, aberta em "Pagar" (AD-230). |
| Cobrança | `payment` (Asaas) | Cada valor a pagar criado no Asaas; o teste e a avulsa servem PIX, boleto e cartão (AD-251). |
| Forma de pagamento | `method` (`pix`, `boleto`, `card`) | PIX e boleto na tela do Ethica; cartão de crédito ou débito na fatura do Asaas (AD-251). |
