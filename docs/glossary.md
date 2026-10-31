# Glossário

Termos de domínio usados no código, na interface e nos documentos. Valores de enum vivem no código (`packages/contracts/src/schemas/`) — aqui só o significado.

| Termo | Código | Significado |
| --- | --- | --- |
| Perícia | `Pericia` (`pericia` module) | Um processo judicial em que o perito (ou assistente técnico) atua. Identificada pelo número CNJ, única por tenant. |
| Número do processo (CNJ) | `numeroProcesso` | Formato `NNNNNNN-DD.AAAA.J.TR.OOOO` (Resolução CNJ 65/2008). |
| Justiça | `justica` | Trabalhista, cível ou federal. |
| Atuação | `papel` | `perito` (nomeado pelo juízo) ou `assistente_tecnico` (de uma das partes). |
| Etapa | `status` da perícia | Nomeada → aceita → vistoria → em laudo → laudo entregue → esclarecimentos → concluída; recusada encerra sem laudo. |
| Nomeação | `dataNomeacao` | Dia em que o juízo nomeou o perito. |
| Prazo do laudo | `prazoLaudo` (só no cadastro) | Dia limite de entrega; vira o prazo "Entrega do laudo" da perícia (AD-109). |
| Prazo | `Prazo` (`pericia`) | Prazo processual da perícia (laudo, esclarecimentos, impugnação…): pendente, protocolado (com a data de protocolo) ou perdido. **Vence em breve** = até 15 dias. |
| Honorários propostos | `honorariosPropostosCents` | Proposta do perito. |
| Honorários fixados | `honorariosFixadosCents` | Valor fixado pelo juízo; vira receita a receber no financeiro. |
| Compromisso | `Compromisso` (`agenda`) | Item da agenda com horário: vistoria, audiência, reunião ou outro. Prazos aparecem no calendário, mas são `Prazo`. |
| Vistoria | `tipo: 'vistoria'` | Visita técnica ao local periciado. |
| Lançamento | `Lancamento` (`financeiro`) | Receita (honorário prévio ou fixado) ou despesa operacional (deslocamento, material, taxas, outras). |
| Parcela (recebimento) | `parcelas` do lançamento de receita | Valor que caiu na conta contra um honorário, com data e conta; estornável. Honorário não é excluído nem cancelado (AD-111). |
| Previsto / parcial / liquidado / cancelado | `status` do lançamento | A receber/pagar, recebido em parte (só receita), já recebido/pago, desconsiderado (só despesa). No honorário, vem das parcelas. **Atrasado** é derivado: previsto ou parcial com vencimento antes de hoje. |
| Feed iCal | `GET /agenda/feed/:token.ics` | Link secreto, só leitura, para assinar compromissos e prazos no Google/Outlook/Apple. |
| Datajud | `providers/datajudClient.ts` | API Pública do CNJ com metadados e movimentos dos processos dos tribunais. |
| Oportunidade | `Oportunidade` (`prospeccao`) | Processo encontrado no Datajud e salvo para análise; pode ser convertido em perícia. |
| Tenant | `Tenant` | O escritório/perito cliente da plataforma; todo dado é isolado por tenant. |
