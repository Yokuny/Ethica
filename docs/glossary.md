# Glossário

Termos de domínio usados no código, na interface e nos documentos. A coluna **Código** é o nome único do termo em todas as camadas (AD-140): termo novo entra aqui antes de ir para o código. Valores de enum vivem no código (`packages/contracts/src/schemas/`) — aqui só o significado.

| Termo | Código | Significado |
| --- | --- | --- |
| Perícia | `Case` (`case` module) | Um processo judicial em que o perito (ou assistente técnico) atua. Identificada pelo número CNJ, única por tenant. |
| Número do processo (CNJ) | `processNumber` | Formato `NNNNNNN-DD.AAAA.J.TR.OOOO` (Resolução CNJ 65/2008). |
| Justiça | `courtType` | Trabalhista, cível ou federal (`labor`, `civil`, `federal`). |
| Atuação | `role` | Perito do juízo (`court_expert`) ou assistente técnico de uma das partes (`technical_assistant`). |
| Etapa | `status` da perícia | Nomeada → aceita → vistoria → em laudo → laudo entregue → esclarecimentos → concluída; recusada encerra sem laudo. |
| Parte | `Party` (`case`), `parties` da perícia | Cadastro reutilizável de parte (`party`, com CPF/CNPJ) ou advogado (`lawyer`, com OAB). Na perícia fica ligada a um **polo**: autor/reclamante (`plaintiff`) ou réu/reclamada (`defendant`) (AD-117). |
| Período imprescrito | `nonPrescribedPeriodStart`/`End` | Parte do contrato de trabalho que ainda pode ser cobrada: do mais recente entre (autuação − 5 anos) e a admissão até a demissão (AD-115). |
| Movimentação | `Case.movements` | Fato do processo com data (entrega do laudo, notificação de honorários, intimação para esclarecimentos ou laudo complementar) que reinicia a contagem de perícia parada (AD-121). |
| Perícia parada | `GET /documents/stalled` | Perícia não encerrada sem movimentação há mais de 60 dias (AD-121). |
| Importação | `POST /expert-cases/import/{pdf,csv}` | PDF da ata/despacho preenche o cadastro para revisão; CSV cria as perícias em lote com relatório por linha (AD-114, AD-118). |
| Nomeação | `nominationDate` | Dia em que o juízo nomeou o perito. |
| Prazo do laudo | `reportDeadline` (só no cadastro) | Dia limite de entrega; vira o prazo "Entrega do laudo" da perícia (AD-109). |
| Prazo | `Deadline` (`case`) | Prazo processual da perícia (laudo, esclarecimentos, impugnação…): pendente, protocolado (com a data de protocolo) ou perdido. **Vence em breve** = até 15 dias. |
| Honorários propostos | `proposedFeesCents` | Proposta do perito. |
| Honorários fixados | `fixedFeesCents` | Valor fixado pelo juízo; vira receita a receber no financeiro. |
| Compromisso | `Appointment` (`agenda`) | Item da agenda com horário: vistoria, audiência, reunião ou outro. Prazos aparecem no calendário, mas são `Deadline`. |
| Vistoria | `type: 'inspection'` no `Appointment`; registro `Inspection` (`agenda`) | Visita técnica ao local periciado. O registro colhido em campo (presentes, paradigmas, funções, agentes, mídias) é um `Inspection` por compromisso (AD-130). |
| Lançamento | `Transaction` (`finance`) | Receita (honorário prévio ou fixado) ou despesa operacional (deslocamento, material, taxas, outras). |
| Parcela (recebimento) | `installments` do lançamento de receita | Valor que caiu na conta contra um honorário, com data e conta; estornável. Honorário não é excluído nem cancelado (AD-111). |
| Previsto / parcial / liquidado / cancelado | `status` do lançamento (`expected`, `partial`, `settled`, `canceled`) | A receber/pagar, recebido em parte (só receita), já recebido/pago, desconsiderado (só despesa). No honorário, vem das parcelas. **Atrasado** é derivado: previsto ou parcial com vencimento antes de hoje. |
| Feed iCal | `GET /agenda/feed/:token.ics` | Link secreto, só leitura, para assinar compromissos e prazos no Google/Outlook/Apple. |
| Datajud | `providers/datajudClient.ts` | API Pública do CNJ com metadados e movimentos dos processos dos tribunais. |
| Laudo / parecer técnico | `Report` (`documents`), `type` `report`/`technical_opinion` | Documento técnico redigido por seções a partir de um modelo, com variáveis da perícia (AD-126). |
| Modelo de laudo | `Template` (`documents`) | Seções sim/não reutilizáveis; os padrões vêm do código e são só leitura (AD-126). |
| Diário de bordo | `Activity` (`identity`) | Registro de quem fez o quê: toda escrita, exportação e entrada no sistema, guardado por 1 ano (AD-134). |
| Oportunidade | `Opportunity` (`prospecting`) | Processo encontrado no Datajud e salvo para análise; pode ser convertido em perícia. |
| Valor de domínio | enums em `packages/contracts/src/schemas/` | Gravado e devolvido pela API em inglês (AD-113); o web traduz com `t()` antes de mostrar. |
| Tenant | `Tenant` | O escritório/perito cliente da plataforma; todo dado é isolado por tenant. |
