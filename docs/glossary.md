# Glossário

Termos de domínio usados no código, na interface e nos documentos. A coluna **Código** é o nome único do termo em todas as camadas (AD-140): termo novo entra aqui antes de ir para o código. Valores de enum vivem no código (`packages/contracts/src/schemas/`) — aqui só o significado.

| Termo | Código | Significado |
| --- | --- | --- |
| Serviço (antes "Perícia" na tela) | `Case` (`case` module) | Um trabalho do perito: processo judicial em que atua como perito ou assistente técnico, ou serviço de tipo criado pelo escritório (AD-158). O processo judicial é identificado pelo número CNJ, único por tenant; o serviço do escritório pode não ter número. |
| Tipo de serviço | `courtType` + `role`, ou `serviceType` com `courtType: 'other'` | Perícia ou assistência técnica civil, trabalhista ou federal, ou um tipo com nome criado pelo escritório (AD-158). |
| Status do serviço | `status` do `Case` (`CASE_STATUS`) | Lista única na ordem da rotina: nomeado – aguardando aceite → proposta de honorários enviada → honorários aceitos → perícia agendada → perícia realizada – laudo em elaboração → laudo entregue → esclarecimentos/impugnação → aguardando pagamento → concluído; suspenso pausa e recusado/cancelado encerra (AD-166). Substitui etapa, fase e o status antigo. |
| Honorário líquido | — (calculado na tela) | Honorário fixado ou contratado (sem ele, o proposto) menos as despesas não canceladas do serviço (AD-159). |
| Número do processo (CNJ) | `processNumber` | Formato `NNNNNNN-DD.AAAA.J.TR.OOOO` (Resolução CNJ 65/2008). |
| Justiça | `courtType` | Trabalhista, cível ou federal (`labor`, `civil`, `federal`); `other` no tipo de serviço do escritório (AD-158). |
| Atuação | `role` | Perito do juízo (`court_expert`) ou assistente técnico de uma das partes (`technical_assistant`). |
| Parte | `Party` (`case`), `parties` da perícia | Cadastro reutilizável de parte (`party`, com CPF/CNPJ) ou advogado (`lawyer`, com OAB), ambos com CREA opcional; um cadastro por nome (`nameKey`, AD-164). Na perícia fica ligada a um **polo**: autor/reclamante (`plaintiff`) ou réu/reclamada (`defendant`) (AD-117); o advogado é da parte que vem antes dele no mesmo polo. |
| Período imprescrito | `nonPrescribedPeriodStart`/`End` | Parte do contrato de trabalho que ainda pode ser cobrada: do mais recente entre (autuação − 5 anos) e a admissão até a demissão (AD-115). |
| Movimentação | `Case.movements` | Fato do processo com data (entrega do laudo, notificação de honorários, intimação para esclarecimentos ou laudo complementar) que reinicia a contagem de perícia parada (AD-121). |
| Perícia parada | `GET /documents/stalled` | Perícia não encerrada sem movimentação há mais de 60 dias (AD-121). |
| Importação | `POST /expert-cases/import/{pdf,csv}` | PDF da ata/despacho preenche o cadastro para revisão; CSV cria as perícias em lote com relatório por linha (AD-114, AD-118). |
| Vara (contato) | `CourtDivision` (`case`); na perícia, `division` | Vara do trabalho, cível ou federal na agenda de contatos do escritório (telefones, e-mail, balcão virtual), por UF e cidade (AD-151). |
| Nomeação | `nominationDate` | Dia em que o juízo nomeou o perito. |
| Prazo do laudo | `reportDeadline` (só no cadastro) | Dia limite de entrega; vira o prazo "Entrega do laudo" da perícia (AD-109). |
| Prazo | `Deadline` (`case`) | Prazo processual da perícia (laudo, esclarecimentos, impugnação…): pendente, protocolado (com a data de protocolo) ou perdido. **Vence em breve** = até 15 dias. |
| Honorários propostos | `proposedFeesCents` | Proposta do perito. |
| Honorários fixados | `fixedFeesCents` | Valor fixado pelo juízo; vira receita a receber no financeiro. |
| Compromisso | `Appointment` (`agenda`) | Item da agenda com horário: vistoria, audiência, reunião ou outro. A data da perícia do serviço vira o compromisso de perícia automático (AD-169). |
| Item da agenda | `CalendarEntry` (`agenda`) | Item de dia inteiro enviado por outro módulo (AD-169): prazo, honorário a receber, despesa ou recebimento, aberto, feito (protocolado/pago), perdido ou cancelado. |
| Vistoria | `type: 'inspection'` no `Appointment`; registro `Inspection` (`agenda`) | Visita técnica ao local periciado. O registro colhido em campo (presentes, paradigmas, funções, agentes, mídias) é um `Inspection` por compromisso (AD-130). |
| Lançamento | `Transaction` (`finance`) | Receita (honorário prévio ou fixado) ou despesa operacional (deslocamento, material, taxas, outras). |
| Parcela (recebimento) | `installments` do lançamento de receita | Valor que caiu na conta contra um honorário, com data e conta; estornável. Honorário não é excluído nem cancelado (AD-111). |
| Previsto / parcial / liquidado / cancelado | `status` do lançamento (`expected`, `partial`, `settled`, `canceled`) | A receber/pagar, recebido em parte (só receita), já recebido/pago, desconsiderado (só despesa). No honorário, vem das parcelas. **Atrasado** é derivado: previsto ou parcial com vencimento antes de hoje. |
| Feed iCal | `GET /agenda/feed/:token.ics` | Link secreto, só leitura, para assinar compromissos e prazos no Google/Outlook/Apple. |
| Datajud | `providers/datajudClient.ts` | API Pública do CNJ com metadados e movimentos dos processos dos tribunais. |
| Laudo / parecer técnico | `Report` (`documents`), `type` `report`/`technical_opinion` | Documento técnico redigido por seções a partir de um modelo, com variáveis da perícia (AD-126). |
| Modelo de laudo | `Template` (`documents`) | Seções sim/não reutilizáveis; os padrões vêm do código e são só leitura (AD-126), um ou mais por tipo (AD-163). |
| Responsável técnico | `Signatory` (`documents`); no laudo, `Report.Signatory` | Quem assina o laudo quando não é a dona da conta: dados, logo, cabeçalho e rodapé próprios, sem acesso ao Ethica (AD-162). |
| OS (ordem de serviço) | `Case.serviceOrder`; sequência `ServiceOrderSequence` (`case`) | Número de controle do serviço, `SIGLA-AAAA-NNN`, dado pela sequência do escritório no cadastro (AD-161). |
| Faz parte do laudo | `sections[].included` | Item que sai no PDF e no Word; desmarcado fica no rascunho com o texto (AD-163). |
| Layout do laudo | `layout` (`reportLayoutSchema`) | Fonte, tamanho, espaçamento, margens, cor dos títulos e páginas (capa, sumário, abertura) do laudo (AD-163). |
| Histórico de auditoria (antes "Diário de bordo") | `Activity` (`identity`) | Registro de quem fez o quê: toda escrita, exportação e entrada no sistema, guardado por 1 ano (AD-134). |
| Oportunidade | `Opportunity` (`prospecting`) | Processo encontrado no Datajud e salvo para análise; pode ser convertido em perícia. |
| Valor de domínio | enums em `packages/contracts/src/schemas/` | Gravado e devolvido pela API em inglês (AD-113); o web traduz com `t()` antes de mostrar. |
| Chave de acesso | `AccessKey` (`identity`) | Link de uso único e código de 6 dígitos enviados ao e-mail da pessoa para entrar ou criar o escritório; vale 15 minutos. Não há senha (AD-155). |
| Tenant | `Tenant` | O escritório/perito cliente da plataforma; todo dado é isolado por tenant. |
